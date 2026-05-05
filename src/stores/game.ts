import { useChessClocks, type ClockId } from '@/composables/useChessClocks';
import { ChessError } from '@/utils/chessError';
import {
  chessIdxToSqr,
  colorToClockId,
  copyPocket,
  getEnPassantCaptureSquare,
  isFLLine,
  isGameStarted,
} from '@/utils/chessOpsGroundUtils';
import type { Config } from '@lichess-org/chessground/config';
import type { File, Key, Piece } from '@lichess-org/chessground/types';
import { makeFen, parseFen } from 'chessops/fen';
import { makeUci, parseUci } from 'chessops/util';
import type { Color, Move, Role, Square } from 'chessops/types';
import { parseSquare } from 'chessops/util';
import { Crazyhouse } from 'chessops/variant';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef, type ShallowRef } from 'vue';
import {
  WsMsgType,
  type WsGameMoveReceive,
  type WsGameEndData,
} from '@/api/websocket/websocket.model';
import { useWebSocketStore } from './ws';
import { useAuthStore } from './auth';
import type { BughouseData, CgApi, PlayerInfo, PocketData } from '@/api/chess/chess.model';
import type { ChatMessage } from '@/components/common/ChatComponent/types';

export const useGameStore = defineStore('game', () => {
  const ws = useWebSocketStore();
  const {
    clocks,
    start: startClock,
    reset: resetClock,
    sync: syncClock,
    advance: advanceClock,
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
  const matePockets = ref<{ partner: PocketData; opponent: PocketData } | null>(null);

  // Display info for all four participants.
  const players = ref<{
    me: PlayerInfo;
    partner: PlayerInfo;
    opponent: PlayerInfo;
    enemy: PlayerInfo;
  } | null>(null);

  /** Which board index (0 or 1) the local player is playing on. */
  const myBoardIdx = ref<0 | 1>(0);

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
      turnColor: mainBoardState.value!.turnColor,
      movable: {
        dests: mainBoardState.value!.movable!.dests,
      },
      check: mainBoardState.value!.check,
      lastMove: mainBoardState.value!.lastMove,
    };

    mainCgApi.value.set(patch);
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
    mainCgApi.value?.set(patch);
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
    mateCgApi.value?.set(patch);
  };

  // In Bughouse, captured pieces go to the partner's board, not the capturer's pocket.
  // Restore pockets after every move to prevent chessops from incorrectly crediting pockets.
  const playWithPocketRestore = (apiRef: ShallowRef<Crazyhouse | null>, move: Move) => {
    const pocketsBefore = apiRef.value!.pockets!.clone();
    apiRef.value!.play(move);
    apiRef.value!.pockets = pocketsBefore;
  };

  // Route a main-board capture to the correct mate-board pocket.
  // mateBoardState orientation is the partner's color, so it directly selects the bucket.
  const applyMainBoardCapture = (capturedPiece: Piece) => {
    if (!matePockets.value || !mateApi.value) return;
    const role = capturedPiece.promoted ? 'pawn' : capturedPiece.role;
    if (role === 'king') return;
    const pocketRole = role as Exclude<Role, 'king'>;
    if (capturedPiece.color === mateBoardState.value?.orientation)
      matePockets.value.partner[pocketRole]++;
    else matePockets.value.opponent[pocketRole]++;

    mateApi.value.pockets![capturedPiece.color][pocketRole]++;
  };

  // Route a mate-board capture to the correct main-board pocket.
  // Captured pieces keep their color — the color directly keys into mainPockets.
  const applyMateBoardCapture = (capturedPiece: Piece) => {
    if (!mainPockets.value || !api.value) return;
    const role = capturedPiece.promoted ? 'pawn' : capturedPiece.role;
    if (role === 'king') return;
    const pocketRole = role as Exclude<Role, 'king'>;
    mainPockets.value[capturedPiece.color][pocketRole]++;

    api.value.pockets![capturedPiece.color][pocketRole]++;
  };

  const promote = (promotion: Exclude<Role, 'king' | 'pawn'>) => {
    if (!api.value) return;

    if (promotionMoveCache.value === null) {
      throw new ChessError('Promotion move cache is empty');
    }

    const { from, to } = promotionMoveCache.value;
    const uci = makeUci({ from, to, promotion });

    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: { idx: myBoardIdx.value, move: uci } });

    // Promotion capture is reported by events.move on the main board (fired when
    // the pawn moved to the promotion square during the user's drag). No manual
    // capture detection needed here.
    playWithPocketRestore(api, { from, to, promotion });

    // Mark the promoted piece so Chessground knows it reverts to a pawn on capture.
    const cgTo = chessIdxToSqr(to);
    const color = mainBoardState.value?.orientation as Color;
    mainCgApi.value?.setPieces(new Map([[cgTo, { role: promotion, color, promoted: true }]]));

    promotionMoveCache.value = null;
    isPromoting.value = false;

    updateBoardState([chessIdxToSqr(from), chessIdxToSqr(to)]);
    advanceClock('main', api.value.fullmoves, api.value.turn);
    syncClock(myClockId.value, clocks[myClockId.value].remainingMs + incr.value);
  };

  const move = (orig: Key, dest: Key) => {
    if (!api.value) return;

    const from = parseSquare(orig),
      to = parseSquare(dest);
    if (from === undefined || to === undefined) {
      throw new ChessError('Invalid move keys: ' + orig + ' -> ' + dest);
    }

    if (!api.value.isLegal({ from, to })) {
      throw new ChessError('Invalid move: ' + orig + ' -> ' + dest);
    }

    if (api.value.board.get(from)?.role === 'pawn' && isFLLine(api.value.turn, dest)) {
      promotionMoveCache.value = { from, to };
      isPromoting.value = true;
      return;
    }

    const uci = makeUci({ from, to });
    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: { idx: myBoardIdx.value, move: uci } });

    // En passant: Chessground fires events.move with an empty destination (no capturedPiece),
    // so we must detect it manually before playWithPocketRestore clears the ep square.
    const isEp = to === api.value.epSquare && api.value.board.get(from)?.role === 'pawn';
    const epCaptureSquare = isEp ? getEnPassantCaptureSquare(to, api.value.turn) : null;
    if (epCaptureSquare !== null && matePockets.value) {
      matePockets.value.partner['pawn']++;
      const mateColor = mainBoardState.value?.orientation === 'white' ? 'black' : 'white';
      mateApi.value!.pockets![mateColor]['pawn']++;
      mainCgApi.value?.setPieces(new Map([[chessIdxToSqr(epCaptureSquare), undefined]]));
    }
    // Normal captures are handled by the events.move handler (applyMainBoardCapture).
    playWithPocketRestore(api, { from, to });
    updateBoardState([orig, dest]);
    advanceClock('main', api.value.fullmoves, api.value.turn);
    syncClock(myClockId.value, clocks[myClockId.value].remainingMs + incr.value);
  };

  const drop = (role: Role, to: Key) => {
    if (!api.value) return;

    if (role === 'pawn' && isFLLine(mainBoardState.value!.orientation!, to)) {
      mainCgApi.value?.setPieces(new Map([[to, undefined]]));
      restoreBoardState();
      return;
    }

    const toSq = parseSquare(to);
    if (toSq === undefined) {
      throw new ChessError('Invalid drop target: ' + to);
    }

    const moverColor = api.value.turn;
    ws.sendMessage({
      type: WsMsgType.GAME_MOVE,
      data: { idx: myBoardIdx.value, move: makeUci({ role, to: toSq }) },
    });

    api.value.play({ role, to: toSq });
    if (mainPockets.value) mainPockets.value[moverColor][role as Exclude<Role, 'king'>]--;

    updateBoardState([to]);
    advanceClock('main', api.value.fullmoves, api.value.turn);
    syncClock(myClockId.value, clocks[myClockId.value].remainingMs + incr.value);
  };

  const moveOpponent = (uci: string) => {
    if (!api.value) return;

    const parsed = parseUci(uci);
    if (!parsed) {
      throw new ChessError('Invalid opponent move UCI: ' + uci);
    }
    if (!api.value.isLegal(parsed)) {
      throw new ChessError('Invalid opponent move: ' + uci);
    }

    const moverColor = api.value.turn;

    if ('from' in parsed) {
      // En passant: Chessground won't report a capturedPiece (empty destination),
      // so detect it manually before playWithPocketRestore clears the ep square.
      const isEp =
        parsed.to === api.value.epSquare && api.value.board.get(parsed.from)?.role === 'pawn';
      const epCaptureSquare = isEp ? getEnPassantCaptureSquare(parsed.to, moverColor) : null;

      // Normal captures are handled by the events.move handler (applyMainBoardCapture).
      playWithPocketRestore(api, parsed);

      const cgFrom = chessIdxToSqr(parsed.from);
      const cgTo = chessIdxToSqr(parsed.to);
      mainCgApi.value?.move(cgFrom, cgTo);

      // En passant move
      if (epCaptureSquare !== null && matePockets.value) {
        const myColor = mainBoardState.value?.orientation;
        matePockets.value.opponent['pawn']++;
        mateApi.value!.pockets![myColor!]['pawn']++;
        mainCgApi.value?.setPieces(new Map([[chessIdxToSqr(epCaptureSquare), undefined]]));
      }

      // Mark opponent's promoted piece so future captures of it correctly revert to pawn.
      if (parsed.promotion) {
        const opponentColor: Color =
          mainBoardState.value?.orientation === 'white' ? 'black' : 'white';
        mainCgApi.value?.setPieces(
          new Map([[cgTo, { role: parsed.promotion, color: opponentColor, promoted: true }]]),
        );
      }

      updateBoardState([chessIdxToSqr(parsed.from), chessIdxToSqr(parsed.to)]);
    } else {
      // Drop: chessops correctly decrements the opponent's pocket (initialized from cfg teams).
      api.value.play(parsed);
      if (mainPockets.value) mainPockets.value[moverColor][parsed.role as Exclude<Role, 'king'>]--;
      updateBoardState([chessIdxToSqr(parsed.to)]);
    }

    advanceClock('main', api.value.fullmoves, api.value.turn);
  };

  /** Route an incoming move to the correct board handler. */
  const receiveMove = (data: WsGameMoveReceive) => {
    if (data.idx === myBoardIdx.value) {
      moveOpponent(data.move);

      syncClock(colorToClockId('white', 'main'), Math.max(0, data.whiteClockTime));
      syncClock(colorToClockId('black', 'main'), Math.max(0, data.blackClockTime));
    } else {
      if (!mateApi.value) return;

      const parsed = parseUci(data.move);
      if (!parsed) throw new ChessError('Invalid mate board UCI: ' + data.move);
      if (!mateApi.value.isLegal(parsed))
        throw new ChessError('Invalid mate board move: ' + data.move);

      let lastMove: Key[];

      if ('from' in parsed) {
        // Normal move on mate board.
        const cgFrom = chessIdxToSqr(parsed.from);
        const cgTo = chessIdxToSqr(parsed.to);

        // En passant: detect BEFORE playing — epSquare is cleared by play().
        const isEp =
          parsed.to === mateApi.value.epSquare &&
          mateApi.value.board.get(parsed.from)?.role === 'pawn';
        const epCaptureSquare = isEp
          ? getEnPassantCaptureSquare(parsed.to, mateApi.value.turn)
          : null;
        if (isEp) {
          applyMateBoardCapture({
            role: 'pawn',
            color: mateApi.value.turn === 'white' ? 'black' : 'white',
          });
        }

        playWithPocketRestore(mateApi, parsed);
        // Animate the move — fires events.move with capturedPiece for normal captures.
        mateCgApi.value?.move(cgFrom, cgTo);
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
        playWithPocketRestore(mateApi, parsed);

        if (matePockets.value) {
          const pocketRole = parsed.role as Exclude<Role, 'king'>;
          const partnerColorOnMate = mateBoardState.value?.orientation as Color | undefined;
          if (dropperColor === partnerColorOnMate) matePockets.value.partner[pocketRole]--;
          else matePockets.value.opponent[pocketRole]--;
        }

        mateCgApi.value?.newPiece({ role: parsed.role, color: dropperColor }, cgTo);
        lastMove = [cgTo];
      }

      updateMateBoardState(lastMove);
      syncClock(colorToClockId('white', 'mate'), Math.max(0, data.whiteClockTime));
      syncClock(colorToClockId('black', 'mate'), Math.max(0, data.blackClockTime));

      advanceClock('mate', mateApi.value.fullmoves, mateApi.value.turn);
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

  const onGameEnd = (data: WsGameEndData) => {
    gameStatus.value = data.status;
    clearClocks();
    const disabledMovable = { color: undefined, dests: new Map<Key, Key[]>() };
    if (mainBoardState.value) {
      mainBoardState.value = { ...mainBoardState.value, movable: disabledMovable };
    }
    mainCgApi.value?.set({ movable: disabledMovable });
  };

  /**
   * Initialize (or re-initialize) the full game state from a server snapshot.
   * Called on both fresh GAME_JOIN and SYNC while in a game.
   */
  const setup = (data: BughouseData | null) => {
    // Clear state if server returned null (game not started yet).
    if (data === null) {
      clear();
      return;
    }

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
      partner: copyPocket(mateApi.value.pockets[partner.color]),
      opponent: copyPocket(mateApi.value.pockets[partnerEnemy.color]),
    };

    const mainTurnColor = isGameStarted(fenSetup) ? fenSetup.turn : null;
    const mateTurnColor = isGameStarted(mateFenSetup) ? mateFenSetup.turn : null;

    resetClock('mainWhite', Math.max(0, myBoard.players[0].clockTime));
    resetClock('mainBlack', Math.max(0, myBoard.players[1].clockTime));
    resetClock('mateWhite', Math.max(0, mateBoard.players[0].clockTime));
    resetClock('mateBlack', Math.max(0, mateBoard.players[1].clockTime));

    if (mainTurnColor) startClock(colorToClockId(mainTurnColor, 'main'));
    if (mateTurnColor) startClock(colorToClockId(mateTurnColor, 'mate'));

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
      events: {
        move: (_orig: Key, _dest: Key, capturedPiece?: Piece) => {
          if (capturedPiece) applyMainBoardCapture(capturedPiece);
        },
      },
      check,
      lastMove: myBoard.lastMove ?? undefined,
    };

    mateBoardState.value = {
      fen: mateBoard.fen,
      orientation: opponentColor,
      viewOnly: true,
      events: {
        move: (_orig: Key, _dest: Key, capturedPiece?: Piece) => {
          if (capturedPiece) applyMateBoardCapture(capturedPiece);
        },
      },
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
    gameStatus.value = null;
    clearClocks();
  };

  return {
    api,
    mateApi,
    clocks,
    isPromoting,
    promotionColor,
    promotionFile,
    mainBoardState,
    mateBoardState,
    mainPockets,
    matePockets,
    players,
    myBoardIdx,
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
