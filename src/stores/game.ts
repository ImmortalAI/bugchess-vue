import { useChessClocks, type ClockId } from '@/composables/useChessClocks';
import { ChessError } from '@/utils/chessError';
import {
  chessIdxToSqr,
  colorToClockId,
  copyPocket,
  getEnPassantCaptureSquare,
  isFLLine,
  turnColorInvert,
} from '@/utils/chessOpsGroundUtils';
import type { Config } from '@lichess-org/chessground/config';
import type { File, Key } from '@lichess-org/chessground/types';
import { makeFen, parseFen } from 'chessops/fen';
import { makeUci, parseUci } from 'chessops/util';
import type { Color, Move, Role, Square } from 'chessops/types';
import { parseSquare } from 'chessops/util';
import { Crazyhouse } from 'chessops/variant';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { WsMsgType } from '@/api/websocket/websocket.model';
import { useWebSocketStore } from './ws';
import { useAuthStore } from './auth';
import type {
  BughouseData,
  CgApi,
  GameEndData,
  GameMoveReceiveData,
  PlayerInfo,
  PocketData,
} from '@/api/chess/chess.model';
import type { ChatMessage } from '@/components/common/ChatComponent/types';
import { playSound } from '@/utils/sounds';
import { useSessionStore } from './session';

export const useGameStore = defineStore('game', () => {
  const ws = useWebSocketStore();
  const {
    clocks,
    start: startClock,
    stopAll: stopAllClocks,
    reset: resetClock,
    sync: syncClock,
    toggle: toggleClock,
    clear: clearClocks,
  } = useChessClocks();

  const api = shallowRef<Crazyhouse | null>(null);
  const mateApi = shallowRef<Crazyhouse | null>(null);

  // Chessground instances — set via registerMainBoard / registerMateBoard from MatchPage.
  const mainCgApi = shallowRef<CgApi | null>(null);
  const mateCgApi = shallowRef<CgApi | null>(null);

  const mainBoardState = shallowRef<Config | undefined>(undefined);
  const mateBoardState = shallowRef<Config | undefined>(undefined);

  const isPromoting = ref(false);
  const promotionMoveCache = ref<{ from: Square; to: Square } | null>(null);
  const lastChatMessage = ref<ChatMessage | null>(null);
  const incr = ref(0);

  // Pockets on the main board — tracked separately for Vue reactivity
  // (chessops mutates them in-place which shallowRef won't detect).
  const mainPockets = ref<{ white: PocketData; black: PocketData } | null>(null);

  // Pockets of both players on the mate (partner's) board.
  // partner = pieces the partner can drop; opponent = pieces the partner's opponent can drop.
  const matePockets = ref<{ white: PocketData; black: PocketData } | null>(null);

  // Display info for all four participants.
  const players = ref<{
    me: PlayerInfo;
    partner: PlayerInfo;
    opponent: PlayerInfo;
    enemy: PlayerInfo;
  } | null>(null);

  /** Which board index (0 or 1) the local player is playing on. */
  const myBoardIdx = ref<0 | 1>(0);

  /** Which team (0 = Team A, 1 = Team B) the local player belongs to. */
  const myTeamIdx = ref<0 | 1>(0);

  /** Game result; null while the game is in progress. */
  const gameStatus = ref<BughouseData['status']>(null);

  // Clock IDs derived from the current player's board orientation.
  const myClockId = computed<ClockId>(() =>
    mainBoardState.value?.orientation === 'white' ? 'mainWhite' : 'mainBlack',
  );
  const opponentClockId = computed<ClockId>(() =>
    myClockId.value === 'mainWhite' ? 'mainBlack' : 'mainWhite',
  );
  // Standard Bughouse: if I'm white on main, my partner is black on mate (and vice versa).
  const partnerClockId = computed<ClockId>(() =>
    myClockId.value === 'mainWhite' ? 'mateBlack' : 'mateWhite',
  );
  const enemyClockId = computed<ClockId>(() =>
    myClockId.value === 'mainWhite' ? 'mateWhite' : 'mateBlack',
  );

  // Promotion overlay helpers — derived from cached move and board orientation.
  const promotionColor = computed<Color | undefined>(() =>
    isPromoting.value ? (mainBoardState.value?.orientation as Color) : undefined,
  );
  const promotionFile = computed<File | undefined>(() => {
    if (!isPromoting.value || !promotionMoveCache.value) return undefined;
    return chessIdxToSqr(promotionMoveCache.value.to)[0] as File;
  });

  const preMDCache = shallowRef<{ from: Key; to: Key } | { role: Role; key: Key } | null>(null);

  // Set to true by capture handlers before updateBoardState/updateMateBoardState runs,
  // so those functions know to play Capture instead of Move.
  let pendingCaptureSound = false;

  // Register the Chessground instance created by a ChessBoard component.
  // Also syncs the board to the latest known config (handles reconnect before remount).
  const registerMainBoard = (cgApi: CgApi) => {
    mainCgApi.value = cgApi;
    if (mainBoardState.value) cgApi.set(mainBoardState.value);
  };

  const registerMateBoard = (cgApi: CgApi) => {
    mateCgApi.value = cgApi;
    if (mateBoardState.value) cgApi.set(mateBoardState.value);
  };

  const unregisterMainBoard = () => {
    mainCgApi.value = null;
  };

  const unregisterMateBoard = () => {
    mateCgApi.value = null;
  };

  const restoreBoardState = () => {
    if (!mainBoardState.value || !mainCgApi.value) return;

    const patch: Config = {
      fen: mainBoardState.value!.fen,
      turnColor: mainBoardState.value!.turnColor,
      movable: {
        dests: mainBoardState.value!.movable!.dests,
      },
      check: mainBoardState.value!.check,
      lastMove: mainBoardState.value!.lastMove,
    };

    mainCgApi.value.set(patch);
  };

  const requestSync = () => {
    ws.sendMessage({ type: WsMsgType.REQ_SYNC, data: {} });
  };

  const updateBoardState = (lastMove: [Key, Key] | [Key]) => {
    if (!api.value) return;

    const turnColor = api.value.turn;
    const myColor = mainBoardState.value?.orientation;
    const isOurTurn = turnColor === myColor;
    const dests = isOurTurn ? chessIdxToSqr(api.value.allDests()) : new Map();
    const check = api.value.isCheck();
    const currentSetup = api.value.toSetup();

    const patch: Config = {
      turnColor,
      movable: {
        dests,
      },
      check,
      lastMove,
    };

    mainBoardState.value = {
      ...mainBoardState.value,
      ...patch,
      fen: makeFen(currentSetup),
      movable: {
        ...mainBoardState.value?.movable,
        dests,
      },
    };

    if (!mainCgApi.value) return;

    mainCgApi.value.set(patch);

    if (pendingCaptureSound) playSound('Capture');
    else playSound('Move');
    pendingCaptureSound = false;
  };

  const updateMateBoardState = (lastMove: Key[]) => {
    if (!mateApi.value) return;
    const turnColor = mateApi.value.turn;
    const check = mateApi.value.isCheck();
    const patch: Config = { turnColor, check, lastMove };
    mateBoardState.value = {
      ...mateBoardState.value,
      fen: makeFen(mateApi.value.toSetup()),
      ...patch,
    };

    if (!mateCgApi.value) return;

    mateCgApi.value.set(patch);

    if (pendingCaptureSound) playSound('Capture');
    else playSound('Move');
    pendingCaptureSound = false;
  };

  // In Bughouse, captured pieces go to the partner's board, not the capturer's pocket.
  // Restore pockets after every move to prevent chessops from incorrectly crediting pockets.
  const apiPlay = (move: Move) => {
    if (!api.value || !mateApi.value) return;

    if ('from' in move) {
      const capture = api.value.board.get(move.to);
      if (capture) {
        const color = capture.color;
        const role = (capture.promoted ? 'pawn' : capture.role) as Exclude<Role, 'king'>;

        matePockets.value![color][role]++;
        mateApi.value.pockets![color][role]++;
        pendingCaptureSound = true;
      }
    }

    const pocketsBefore = api.value.pockets!.clone();

    api.value.play(move);

    api.value.pockets = pocketsBefore;
  };

  const mateApiPlay = (move: Move) => {
    if (!api.value || !mateApi.value) return;

    if ('from' in move) {
      const capture = mateApi.value.board.get(move.to);
      if (capture) {
        const color = capture.color;
        const role = (capture.promoted ? 'pawn' : capture.role) as Exclude<Role, 'king'>;

        mainPockets.value![color][role]++;
        api.value.pockets![color][role]++;
        pendingCaptureSound = true;
      }
    }

    const pocketsBefore = mateApi.value.pockets!.clone();

    mateApi.value.play(move);

    mateApi.value.pockets = pocketsBefore;
  };

  const promote = (promotion: Exclude<Role, 'king' | 'pawn'>) => {
    if (!api.value) return;

    if (promotionMoveCache.value === null) {
      throw new ChessError('Promotion move cache is empty');
    }

    if (
      !api.value.isLegal({
        from: promotionMoveCache.value.from,
        to: promotionMoveCache.value.to,
        promotion,
      })
    ) {
      promotionMoveCache.value = null;
      isPromoting.value = false;
      restoreBoardState();
      return;
    }

    const { from, to } = promotionMoveCache.value;
    const uci = makeUci({ from, to, promotion });

    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: { idx: myBoardIdx.value, move: uci } });

    // Promotion capture is reported by events.move on the main board (fired when
    // the pawn moved to the promotion square during the user's drag). No manual
    // capture detection needed here.
    apiPlay({ from, to, promotion });

    // Mark the promoted piece so Chessground knows it reverts to a pawn on capture.
    const cgTo = chessIdxToSqr(to);
    const color = mainBoardState.value?.orientation as Color;
    mainCgApi.value?.setPieces(new Map([[cgTo, { role: promotion, color, promoted: true }]]));

    promotionMoveCache.value = null;
    isPromoting.value = false;

    updateBoardState([chessIdxToSqr(from), chessIdxToSqr(to)]);
    toggleClock('main');
    syncClock(myClockId.value, clocks[myClockId.value].remainingMs + incr.value);
  };

  const move = (orig: Key, dest: Key) => {
    if (!api.value) return;

    const from = parseSquare(orig),
      to = parseSquare(dest);
    if (from === undefined || to === undefined) {
      throw new ChessError('Invalid move keys: ' + orig + ' -> ' + dest);
    }

    if (api.value.board.get(from)?.role === 'pawn' && isFLLine(api.value.turn, dest)) {
      promotionMoveCache.value = { from, to };
      isPromoting.value = true;
      return;
    }

    if (!api.value.isLegal({ from, to })) {
      restoreBoardState();
      return;
    }

    const uci = makeUci({ from, to });
    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: { idx: myBoardIdx.value, move: uci } });

    // En passant: Chessground fires events.move with an empty destination (no capturedPiece),
    // so we must detect it manually before playWithPocketRestore clears the ep square.
    const isEp = to === api.value.epSquare && api.value.board.get(from)?.role === 'pawn';
    const epCaptureSquare = isEp ? getEnPassantCaptureSquare(to, api.value.turn) : null;
    if (epCaptureSquare !== null && matePockets.value) {
      const mateColor = turnColorInvert(mainBoardState.value?.orientation ?? 'white');
      matePockets.value[mateColor]['pawn']++;
      mateApi.value!.pockets![mateColor]['pawn']++;
      mainCgApi.value?.setPieces(new Map([[chessIdxToSqr(epCaptureSquare), undefined]]));
      pendingCaptureSound = true;
    }
    // Normal captures are handled by the events.move handler (applyMainBoardCapture).
    apiPlay({ from, to });
    updateBoardState([orig, dest]);
    toggleClock('main');
    syncClock(myClockId.value, clocks[myClockId.value].remainingMs + incr.value);
  };

  const drop = (role: Role, to: Key) => {
    if (!api.value) return;

    const toSq = parseSquare(to);
    if (toSq === undefined) {
      throw new ChessError('Invalid drop target: ' + to);
    }

    const dropMove: Move = { role, to: toSq };
    if (!api.value.isLegal(dropMove)) {
      restoreBoardState();
      return;
    }

    const moverColor = api.value.turn;
    ws.sendMessage({
      type: WsMsgType.GAME_MOVE,
      data: { idx: myBoardIdx.value, move: makeUci(dropMove) },
    });

    api.value.play(dropMove);
    if (mainPockets.value) mainPockets.value[moverColor][role as Exclude<Role, 'king'>]--;

    updateBoardState([to]);
    toggleClock('main');
    syncClock(myClockId.value, clocks[myClockId.value].remainingMs + incr.value);
  };

  const playPreMoveDrop = () => {
    if (!preMDCache.value || !api.value || !mainCgApi.value) return;

    if ('from' in preMDCache.value) {
      const from = parseSquare(preMDCache.value.from),
        to = parseSquare(preMDCache.value.to);

      if (from === undefined || to === undefined) {
        throw new ChessError(
          'Invalid preMoveDrop keys: ' + preMDCache.value.from + ' -> ' + preMDCache.value.to,
        );
      }

      if (api.value.isLegal({ from, to })) {
        mainCgApi.value.playPremove();
      } else {
        mainCgApi.value.cancelPremove();
      }
    } else {
      const role = preMDCache.value.role,
        key = parseSquare(preMDCache.value.key);

      if (role === undefined || key === undefined) {
        throw new ChessError(
          'Invalid preMoveDrop keys: ' + preMDCache.value.role + ' -> ' + preMDCache.value.key,
        );
      }

      if (api.value.isLegal({ role, to: key })) {
        mainCgApi.value.playPredrop(() => true);
      } else {
        mainCgApi.value.cancelPredrop();
      }
    }
  };

  const moveOpponent = (uci: string) => {
    if (!api.value) return;

    const parsed = parseUci(uci);
    if (!parsed) {
      requestSync();
      return;
    }
    if (api.value.isLegal(parsed)) {
      requestSync();
      return;
    }

    const moverColor = api.value.turn;

    if ('from' in parsed) {
      // En passant: Chessground won't report a capturedPiece (empty destination),
      // so detect it manually before playWithPocketRestore clears the ep square.
      const isEp =
        parsed.to === api.value.epSquare && api.value.board.get(parsed.from)?.role === 'pawn';
      const epCaptureSquare = isEp ? getEnPassantCaptureSquare(parsed.to, moverColor) : null;

      // Normal captures are handled by the events.move handler (applyMainBoardCapture).
      apiPlay(parsed);

      const cgFrom = chessIdxToSqr(parsed.from);
      const cgTo = chessIdxToSqr(parsed.to);
      mainCgApi.value?.move(cgFrom, cgTo);

      // En passant move
      if (epCaptureSquare !== null && matePockets.value) {
        const myColor = mainBoardState.value?.orientation;
        matePockets.value[myColor!]['pawn']++;
        mateApi.value!.pockets![myColor!]['pawn']++;
        mainCgApi.value?.setPieces(new Map([[chessIdxToSqr(epCaptureSquare), undefined]]));
        pendingCaptureSound = true;
      }

      // Mark opponent's promoted piece so future captures of it correctly revert to pawn.
      if (parsed.promotion) {
        mainCgApi.value?.setPieces(
          new Map([[cgTo, { role: parsed.promotion, color: moverColor, promoted: true }]]),
        );
      }

      updateBoardState([chessIdxToSqr(parsed.from), chessIdxToSqr(parsed.to)]);
    } else {
      // Drop: chessops correctly decrements the opponent's pocket (initialized from cfg teams).
      api.value.play(parsed);
      if (mainPockets.value) mainPockets.value[moverColor][parsed.role as Exclude<Role, 'king'>]--;

      const cgTo = chessIdxToSqr(parsed.to);
      mainCgApi.value?.setPieces(new Map([[cgTo, { role: parsed.role, color: moverColor }]]));

      updateBoardState([chessIdxToSqr(parsed.to)]);
    }

    toggleClock('main');

    setTimeout(playPreMoveDrop, 1);
  };

  /** Route an incoming move to the correct board handler. */
  const receiveMove = (data: GameMoveReceiveData) => {
    if (data.idx === myBoardIdx.value) {
      moveOpponent(data.move);

      syncClock(colorToClockId('white', 'main'), Math.max(0, data.whiteClockTime));
      syncClock(colorToClockId('black', 'main'), Math.max(0, data.blackClockTime));
    } else {
      if (!mateApi.value) return;

      const parsed = parseUci(data.move);
      if (!parsed) {
        requestSync();
        return;
      }
      if (mateApi.value.isLegal(parsed)) {
        requestSync();
        return;
      }

      let lastMove: Key[];

      if ('from' in parsed) {
        // Normal move on mate board.
        const cgFrom = chessIdxToSqr(parsed.from);
        const cgTo = chessIdxToSqr(parsed.to);

        // En passant: detect BEFORE playing — epSquare is cleared by play().
        const turnColor = mateApi.value.turn;
        const isEp =
          parsed.to === mateApi.value.epSquare &&
          mateApi.value.board.get(parsed.from)?.role === 'pawn';
        const epCaptureSquare = isEp ? getEnPassantCaptureSquare(parsed.to, turnColor) : null;

        mateApiPlay(parsed);
        // Animate the move — fires events.move with capturedPiece for normal captures.
        mateCgApi.value?.move(cgFrom, cgTo);

        // En passant move
        if (epCaptureSquare !== null && mainPockets.value) {
          const captureColor = turnColorInvert(turnColor);
          mainPockets.value[captureColor]['pawn']++;
          api.value!.pockets![captureColor]['pawn']++;
          mainCgApi.value?.setPieces(new Map([[chessIdxToSqr(epCaptureSquare), undefined]]));
          pendingCaptureSound = true;
        }

        if (epCaptureSquare !== null)
          mateCgApi.value?.setPieces(new Map([[chessIdxToSqr(epCaptureSquare), undefined]]));

        // Mark promoted piece so future captures of it revert to pawn.
        if (parsed.promotion) {
          const promotedPiece = mateApi.value.board.get(parsed.to);
          if (promotedPiece)
            mateCgApi.value?.setPieces(new Map([[cgTo, { ...promotedPiece, promoted: true }]]));
        }

        lastMove = [cgFrom, cgTo];
      } else {
        // Drop on mate board.
        const dropperColor = mateApi.value.turn;
        const cgTo = chessIdxToSqr(parsed.to);
        mateApiPlay(parsed);

        matePockets.value![dropperColor][parsed.role as Exclude<Role, 'king'>]--;

        mateCgApi.value?.newPiece({ role: parsed.role, color: dropperColor }, cgTo);
        lastMove = [cgTo];
      }

      updateMateBoardState(lastMove);
      syncClock(colorToClockId('white', 'mate'), Math.max(0, data.whiteClockTime));
      syncClock(colorToClockId('black', 'mate'), Math.max(0, data.blackClockTime));

      toggleClock('mate');
    }
  };

  const addChatMessage = (sender: string, text: string, isOwn: boolean) => {
    lastChatMessage.value = { sender, text, isOwn };
  };

  const sendChatMessage = (text: string, senderName: string) => {
    ws.sendMessage({ type: WsMsgType.GAME_CHAT_MSG_SEND, data: text });
    addChatMessage(senderName, text, true);
  };

  const resign = () => {
    ws.sendMessage({ type: WsMsgType.GAME_RESIGN, data: {} });
  };

  const onGameEnd = (data: GameEndData) => {
    gameStatus.value = data.status;
    stopAllClocks();
    const disabledMovable = { color: undefined, dests: new Map<Key, Key[]>() };
    if (mainBoardState.value) {
      mainBoardState.value = { ...mainBoardState.value, movable: disabledMovable };
    }
    mainCgApi.value?.set({ movable: disabledMovable });

    if (data.status === 'Draw' || data.status === 'Abort') {
      playSound('Draw');
    } else if (
      (data.status === 'WinA' && myTeamIdx.value === 0) ||
      (data.status === 'WinB' && myTeamIdx.value === 1)
    ) {
      playSound('Victory');
    } else {
      playSound('Defeat');
    }
  };

  /**
   * Initialize (or re-initialize) the full game state from a server snapshot.
   * Called on both fresh GAME_JOIN and SYNC while in a game.
   */
  const setup = (data: BughouseData | null) => {
    clear();

    if (data === null) return;

    gameStatus.value = data.status;
    incr.value = data.incr;

    // Find this user's board and player slot indices.
    const myUsername = useAuthStore().user?.username;
    let b: 0 | 1 = 0;
    let p: 0 | 1 = 0;

    outer: for (const bi of [0, 1] as const) {
      for (const pi of [0, 1] as const) {
        if (data.boards[bi].players[pi].name === myUsername) {
          b = bi;
          p = pi;
          break outer;
        }
      }
    }

    myBoardIdx.value = b;
    myTeamIdx.value = b === p ? 0 : 1;
    const mateBoardIdxVal = (1 - b) as 0 | 1;

    const myBoard = data.boards[b];
    const mateBoard = data.boards[mateBoardIdxVal];

    const me = myBoard.players[p];
    const opponent = myBoard.players[(1 - p) as 0 | 1];
    // In standard Bughouse, partner has the opposite color on the other board.
    const partner = mateBoard.players[(1 - p) as 0 | 1];
    const partnerEnemy = mateBoard.players[p];

    const myColor: Color = me.color;
    const opponentColor: Color = opponent.color;

    players.value = {
      me: { username: me.name, rating: me.rating },
      partner: { username: partner.name, rating: partner.rating },
      opponent: { username: opponent.name, rating: opponent.rating },
      enemy: { username: partnerEnemy.name, rating: partnerEnemy.rating },
    };

    // Parse the FEN and set up the game.
    const parsedFen = parseFen(myBoard.fen);
    if (parsedFen.isErr) throw new ChessError('Invalid FEN: ' + myBoard.fen);
    const fenSetup = parsedFen.value;

    api.value = Crazyhouse.fromSetup(fenSetup).unwrap();
    if (!api.value.pockets) throw new ChessError('Missing pockets in FEN: ' + myBoard.fen);

    // Set up main board pockets from the chessops state initialized from FEN.
    mainPockets.value = {
      white: copyPocket(api.value.pockets.white),
      black: copyPocket(api.value.pockets.black),
    };

    // Set up the mate board chessops instance.
    const parsedMateFen = parseFen(mateBoard.fen);
    if (parsedMateFen.isErr) throw new ChessError('Invalid mate FEN: ' + mateBoard.fen);
    const mateFenSetup = parsedMateFen.value;

    mateApi.value = Crazyhouse.fromSetup(mateFenSetup).unwrap();
    if (!mateApi.value.pockets) throw new ChessError('Missing pockets in FEN: ' + mateBoard.fen);

    // Set up mate board pockets from the chessops state initialized from FEN.
    matePockets.value = {
      white: copyPocket(mateApi.value.pockets.white),
      black: copyPocket(mateApi.value.pockets.black),
    };

    if (myBoard.autoAbortAt) {
      const mainAutoAbortMs = Math.max(0, myBoard.autoAbortAt - Date.now());

      if (fenSetup.halfmoves === 0) {
        resetClock('mainWhite', mainAutoAbortMs);
        resetClock('mainBlack', mainAutoAbortMs);
      } else {
        resetClock('mainWhite', Math.max(0, myBoard.players[0].clockTime));
        resetClock('mainBlack', mainAutoAbortMs);
      }
    } else {
      resetClock('mainWhite', Math.max(0, myBoard.players[0].clockTime));
      resetClock('mainBlack', Math.max(0, myBoard.players[1].clockTime));
    }
    startClock(colorToClockId(fenSetup.turn, 'main'));

    if (mateBoard.autoAbortAt) {
      const mateAutoAbortMs = Math.max(0, mateBoard.autoAbortAt - Date.now());

      if (mateFenSetup.halfmoves === 0) {
        resetClock('mateWhite', mateAutoAbortMs);
        resetClock('mateBlack', mateAutoAbortMs);
      } else {
        resetClock('mateWhite', Math.max(0, mateBoard.players[0].clockTime));
        resetClock('mateBlack', mateAutoAbortMs);
      }
    } else {
      resetClock('mateWhite', Math.max(0, mateBoard.players[0].clockTime));
      resetClock('mateBlack', Math.max(0, mateBoard.players[1].clockTime));
    }
    startClock(colorToClockId(mateFenSetup.turn, 'mate'));

    const turnColor = api.value.turn;
    const isOurTurn = turnColor === myColor;
    const dests = isOurTurn ? chessIdxToSqr(api.value.allDests()) : new Map();
    const check = api.value.isCheck();

    mainBoardState.value = {
      fen: myBoard.fen,
      orientation: myColor,
      turnColor,
      movable: {
        free: false,
        color: myColor,
        dests,
        events: {
          after: move,
          afterNewPiece: drop,
        },
      },
      premovable: {
        enabled: true,
        events: {
          set: (orig, dest) => (preMDCache.value = { from: orig, to: dest }),
          unset: () => (preMDCache.value = null),
        },
      },
      predroppable: {
        enabled: true,
        events: {
          set: (role, key) => (preMDCache.value = { role, key }),
          unset: () => (preMDCache.value = null),
        },
      },
      check,
      lastMove: myBoard.lastMove ?? undefined,
    };

    mateBoardState.value = {
      fen: mateBoard.fen,
      orientation: opponentColor,
      viewOnly: true,
      check: mateApi.value.isCheck(),
      lastMove: mateBoard.lastMove ?? undefined,
    };

    // Sync live Chessground instances if already mounted (reconnect / SYNC scenario).
    mainCgApi.value?.set(mainBoardState.value);
    mateCgApi.value?.set(mateBoardState.value);
  };

  const clear = () => {
    api.value = null;
    mateApi.value = null;
    mainCgApi.value = null;
    mateCgApi.value = null;
    mainBoardState.value = undefined;
    mateBoardState.value = undefined;
    isPromoting.value = false;
    promotionMoveCache.value = null;
    lastChatMessage.value = null;
    incr.value = 0;
    mainPockets.value = null;
    matePockets.value = null;
    players.value = null;
    myBoardIdx.value = 0;
    myTeamIdx.value = 0;
    gameStatus.value = null;
    clearClocks();
    useSessionStore().updateView();
  };

  return {
    api,
    mateApi,
    clocks,
    isPromoting,
    promotionColor,
    promotionFile,
    preMDCache,
    mainBoardState,
    mateBoardState,
    mainPockets,
    matePockets,
    players,
    myBoardIdx,
    myTeamIdx,
    gameStatus,
    myClockId,
    opponentClockId,
    partnerClockId,
    enemyClockId,
    lastChatMessage,
    setup,
    clear,
    promote,
    move,
    drop,
    moveOpponent,
    receiveMove,
    resign,
    onGameEnd,
    addChatMessage,
    sendChatMessage,
    registerMainBoard,
    registerMateBoard,
    unregisterMainBoard,
    unregisterMateBoard,
  };
});
