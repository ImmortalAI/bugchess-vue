import { useChessClocks, type ClockId } from '@/composables/useChessClocks';
import { ChessError } from '@/utils/chessError';
import {
  chessIdxToSqr,
  colorToClockId,
  isFLLine,
  isGameStarted,
} from '@/utils/chessOpsGroundUtils';
import type { Config } from '@lichess-org/chessground/config';
import type { File, Key, Piece } from '@lichess-org/chessground/types';
import { makeFen, parseFen } from 'chessops/fen';
import { Material } from 'chessops/setup';
import { makeUci, parseUci } from 'chessops/util';
import type { Color, NormalMove, Role, Square } from 'chessops/types';
import { parseSquare } from 'chessops/util';
import { Crazyhouse } from 'chessops/variant';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
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
    toggle: toggleClock,
    clear: clearClocks,
  } = useChessClocks();

  const api = shallowRef<Crazyhouse | null>(null);

  // Chessground instances — set via registerMainBoard / registerMateBoard from MatchPage.
  const mainCgApi = shallowRef<CgApi | null>(null);
  const mateCgApi = shallowRef<CgApi | null>(null);

  const mainBoardState = shallowRef<Config | undefined>(undefined);
  const mateBoardState = shallowRef<Config | undefined>(undefined);

  const isPromoting = ref(false);
  const promotionMoveCache = ref<{ from: Square; to: Square } | null>(null);
  const lastChatMessage = ref<ChatMessage | null>(null);

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

  const updateBoardState = (lastMove?: Key[]) => {
    if (!api.value) return;

    const turnColor = api.value.turn;
    const myColor = mainBoardState.value?.orientation;
    const isOurTurn = turnColor === myColor;
    const dests = isOurTurn ? chessIdxToSqr(api.value.allDests()) : new Map();
    const check = api.value.isCheck();
    const currentSetup = api.value.toSetup();

    const config: Config = {
      ...mainBoardState.value,
      fen: makeFen(currentSetup),
      turnColor,
      movable: {
        color: isOurTurn ? myColor : undefined,
        dests,
      },
      check,
      lastMove,
    };

    mainBoardState.value = config;
    mainCgApi.value?.set(config);
  };

  // In Bughouse, captured pieces go to the partner's board, not the capturer's pocket.
  // Restore pockets after every normal move to prevent chessops from incorrectly
  // crediting this board's pockets.
  const playNormal = (move: NormalMove) => {
    const pocketsBefore = api.value!.pockets!.clone();
    api.value!.play(move);
    api.value!.pockets = pocketsBefore;
  };

  // Route a main-board capture to the correct mate-board pocket.
  // In Bughouse, the piece captured on the main board goes to the partner's board.
  // capturedPiece is the Chessground piece that was on the destination square.
  const applyMainBoardCapture = (capturedPiece: Piece) => {
    if (!matePockets.value) return;
    const myColor = mainBoardState.value?.orientation as Color | undefined;
    if (!myColor) return;
    const opponentColor: Color = myColor === 'white' ? 'black' : 'white';
    // Promoted pieces revert to pawn when captured (Bughouse rule).
    const role = capturedPiece.promoted ? 'pawn' : capturedPiece.role;
    if (role === 'king') return;
    const pocketRole = role as Exclude<Role, 'king'>;
    if (capturedPiece.color === opponentColor) {
      // User captured opponent's piece → goes to partner's pocket (mate board).
      matePockets.value.partner[pocketRole]++;
    } else {
      // Opponent captured user's piece → goes to the partner's opponent's pocket.
      matePockets.value.opponent[pocketRole]++;
    }
  };

  // Route a mate-board capture to the correct main-board pocket.
  // On the mate board the enemy has the SAME color as me, so capturedPiece.color === myColor
  // means the enemy's piece was taken by the partner → goes to my pocket.
  const applyMateBoardCapture = (capturedPiece: Piece) => {
    if (!mainPockets.value) return;
    const myColor = mainBoardState.value?.orientation as Color | undefined;
    if (!myColor) return;
    const opponentColor: Color = myColor === 'white' ? 'black' : 'white';
    const role = capturedPiece.promoted ? 'pawn' : capturedPiece.role;
    if (role === 'king') return;
    const pocketRole = role as Exclude<Role, 'king'>;
    if (capturedPiece.color === myColor) {
      // Enemy piece captured by partner → goes to my pocket on the main board.
      mainPockets.value[myColor][pocketRole]++;
    } else {
      // Partner piece captured by enemy → goes to opponent's pocket on the main board.
      mainPockets.value[opponentColor][pocketRole]++;
    }
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
    playNormal({ from, to, promotion });
    updateBoardState([chessIdxToSqr(from), chessIdxToSqr(to)]);

    // Mark the promoted piece so Chessground knows it reverts to a pawn on capture.
    const cgTo = chessIdxToSqr(to);
    const color = mainBoardState.value?.orientation as Color;
    mainCgApi.value?.setPieces(new Map([[cgTo, { role: promotion, color, promoted: true }]]));

    promotionMoveCache.value = null;
    isPromoting.value = false;
    toggleClock('main');
  };

  const move = (orig: Key, dest: Key) => {
    if (!api.value) return;

    const from = parseSquare(orig),
      to = parseSquare(dest);
    if (from === undefined || to === undefined) {
      throw new ChessError('Invalid move keys: ' + orig + ' -> ' + dest);
    }

    if (isFLLine(api.value.turn, dest)) {
      promotionMoveCache.value = { from, to };
      isPromoting.value = true;
      return;
    }

    const uci = makeUci({ from, to });
    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: { idx: myBoardIdx.value, move: uci } });

    // En passant: Chessground fires events.move with an empty destination (no capturedPiece),
    // so we must detect it manually before playNormal clears the ep square.
    const isEp = to === api.value.epSquare && api.value.board.get(from)?.role === 'pawn';
    if (isEp && matePockets.value) matePockets.value.partner['pawn']++;
    // Normal captures are handled by the events.move handler (applyMainBoardCapture).
    playNormal({ from, to });
    updateBoardState([orig, dest]);
    toggleClock('main');
  };

  const drop = (role: Role, to: Key) => {
    if (!api.value) return;

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
    toggleClock('main');
  };

  const moveOpponent = (uci: string) => {
    if (!api.value) return;

    const parsed = parseUci(uci);
    if (!parsed) {
      throw new ChessError('Invalid opponent move UCI: ' + uci);
    }

    const moverColor = api.value.turn;

    if ('from' in parsed) {
      // En passant: Chessground won't report a capturedPiece (empty destination),
      // so detect it manually before playNormal clears the ep square.
      const isEp =
        parsed.to === api.value.epSquare && api.value.board.get(parsed.from)?.role === 'pawn';
      if (isEp && matePockets.value) matePockets.value.opponent['pawn']++;
      // Normal captures are handled by the events.move handler (applyMainBoardCapture).
      playNormal(parsed);

      const cgFrom = chessIdxToSqr(parsed.from);
      const cgTo = chessIdxToSqr(parsed.to);
      mainCgApi.value?.move(cgFrom, cgTo);

      // Mark opponent's promoted piece so future captures of it correctly revert to pawn.
      if (parsed.promotion) {
        const opponentColor: Color =
          mainBoardState.value?.orientation === 'white' ? 'black' : 'white';
        mainCgApi.value?.setPieces(
          new Map([[cgTo, { role: parsed.promotion, color: opponentColor, promoted: true }]]),
        );
      }

      // Build updated config without FEN so Chessground keeps the animated position.
      const turnColor = api.value.turn;
      const isOurTurn = turnColor === (mainBoardState.value?.orientation as Color | undefined);
      const dests = isOurTurn ? chessIdxToSqr(api.value.allDests()) : new Map();
      const check = api.value.isCheck();
      const currentSetup = api.value.toSetup();

      const config: Config = {
        ...mainBoardState.value,
        fen: makeFen(currentSetup),
        turnColor,
        movable: {
          color: isOurTurn ? (mainBoardState.value?.orientation as Color) : undefined,
          dests,
        },
        check,
        lastMove: [cgFrom, cgTo],
      };
      mainBoardState.value = config;
      // Pass fen: undefined so Chessground keeps its animated piece positions.
      mainCgApi.value?.set({ ...config, fen: undefined });
    } else {
      // Drop: chessops correctly decrements the opponent's pocket (initialized from cfg teams).
      api.value.play(parsed);
      if (mainPockets.value) mainPockets.value[moverColor][parsed.role as Exclude<Role, 'king'>]--;
      updateBoardState([chessIdxToSqr(parsed.to)]);
    }

    toggleClock('main');
  };

  /** Route an incoming move to the correct board handler. */
  const receiveMove = (data: WsGameMoveReceive) => {
    if (data.idx === myBoardIdx.value) {
      moveOpponent(data.move);
      // After moveOpponent, api.value.turn is the color now to move (clock running).
      const elapsed = Math.max(0, Date.now() - data.timestamp);
      const nowActive = api.value!.turn;
      syncClock(
        colorToClockId('white', 'main'),
        Math.max(0, data.white - (nowActive === 'white' ? elapsed : 0)),
      );
      syncClock(
        colorToClockId('black', 'main'),
        Math.max(0, data.black - (nowActive === 'black' ? elapsed : 0)),
      );
    } else {
      if (data.move.includes('@')) {
        // Drop on mate board: no capture possible, just update lastMove display.
        const lastMove = parseLastMove(data.move) ?? undefined;
        if (mateBoardState.value) {
          mateBoardState.value = { ...mateBoardState.value, lastMove };
          mateCgApi.value?.set({ lastMove });
        }
      } else {
        const cgFrom = data.move.slice(0, 2) as Key;
        const cgTo = data.move.slice(2, 4) as Key;

        // Read the moving piece BEFORE the move for en passant detection and
        // promotion marking — cgApi.move() modifies Chessground state synchronously.
        const movingPiece = mateCgApi.value?.state.pieces.get(cgFrom);
        const destPiece = mateCgApi.value?.state.pieces.get(cgTo);

        // En passant: pawn moves diagonally to an empty square.
        // Chessground won't fire capturedPiece in this case.
        const isEp = movingPiece?.role === 'pawn' && !destPiece && cgFrom[0] !== cgTo[0];
        if (isEp && movingPiece) {
          // The captured pawn has the opposite color of the moving pawn.
          applyMateBoardCapture({
            role: 'pawn',
            color: movingPiece.color === 'white' ? 'black' : 'white',
          });
        }

        // Apply the move — fires events.move (async) with capturedPiece for normal captures.
        mateCgApi.value?.move(cgFrom, cgTo);

        // Mark promoted piece on mate board so future captures revert to pawn.
        const promotionChar = data.move.length === 5 ? data.move[4] : undefined;
        if (promotionChar && movingPiece) {
          const promotionRole = charToRole(promotionChar);
          if (promotionRole) {
            mateCgApi.value?.setPieces(
              new Map([[cgTo, { role: promotionRole, color: movingPiece.color, promoted: true }]]),
            );
          }
        }

        if (mateBoardState.value) {
          mateBoardState.value = { ...mateBoardState.value, lastMove: [cgFrom, cgTo] };
        }

        // Sync mate board clocks (mirrors main board pattern).
        const elapsed = Math.max(0, Date.now() - data.timestamp);
        const nowActive = movingPiece
          ? movingPiece.color === 'white'
            ? 'black'
            : 'white'
          : 'white';
        syncClock(
          colorToClockId('white', 'mate'),
          Math.max(0, data.white - (nowActive === 'white' ? elapsed : 0)),
        );
        syncClock(
          colorToClockId('black', 'mate'),
          Math.max(0, data.black - (nowActive === 'black' ? elapsed : 0)),
        );
      }
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

  const parseLastMove = (uci: string): Key[] | undefined => {
    if (!uci) return undefined;
    if (uci.includes('@')) return [uci.slice(uci.indexOf('@') + 1) as Key];
    return [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key];
  };

  const charToRole = (char: string): Exclude<Role, 'king' | 'pawn'> | undefined => {
    const map: Record<string, Exclude<Role, 'king' | 'pawn'>> = {
      q: 'queen',
      r: 'rook',
      b: 'bishop',
      n: 'knight',
    };
    return map[char];
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

    const pockets = Material.empty();
    Object.assign(pockets[myColor], me.pocket);
    Object.assign(pockets[opponentColor], opponent.pocket);
    fenSetup.pockets = pockets;

    api.value = Crazyhouse.fromSetup(fenSetup).unwrap();

    // Set up pockets for both boards.
    mainPockets.value = {
      white: { ...(myColor === 'white' ? me.pocket : opponent.pocket) },
      black: { ...(myColor === 'black' ? me.pocket : opponent.pocket) },
    };
    matePockets.value = {
      partner: { ...partner.pocket },
      opponent: { ...partnerEnemy.pocket },
    };

    // Parse the FEN and set up the game.
    const parsedMateFen = parseFen(mateBoard.fen);
    const mainTurnColor = isGameStarted(fenSetup) ? fenSetup.turn : null;
    const mateTurnColor =
      parsedMateFen.isOk && isGameStarted(parsedMateFen.value) ? parsedMateFen.value.turn : null;

    // Compensate for time elapsed since the server snapshot was taken (network latency).
    const elapsed = Math.max(0, Date.now() - data.timestamp);

    resetClock(
      'mainWhite',
      Math.max(0, myBoard.players[0].clock - (mainTurnColor === 'white' ? elapsed : 0)),
    );
    resetClock(
      'mainBlack',
      Math.max(0, myBoard.players[1].clock - (mainTurnColor === 'black' ? elapsed : 0)),
    );
    resetClock(
      'mateWhite',
      Math.max(0, mateBoard.players[0].clock - (mateTurnColor === 'white' ? elapsed : 0)),
    );
    resetClock(
      'mateBlack',
      Math.max(0, mateBoard.players[1].clock - (mateTurnColor === 'black' ? elapsed : 0)),
    );

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
        color: isOurTurn ? myColor : undefined,
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
      movable: {
        free: false,
        dests: new Map<Key, Key[]>(),
      },
      events: {
        move: (_orig: Key, _dest: Key, capturedPiece?: Piece) => {
          if (capturedPiece) applyMateBoardCapture(capturedPiece);
        },
      },
      lastMove: mateBoard.lastMove ?? undefined,
    };

    // Sync live Chessground instances if already mounted (reconnect / SYNC scenario).
    mainCgApi.value?.set(mainBoardState.value);
    mateCgApi.value?.set(mateBoardState.value);
  };

  const clear = () => {
    api.value = null;
    mainCgApi.value = null;
    mateCgApi.value = null;
    mainBoardState.value = undefined;
    mateBoardState.value = undefined;
    isPromoting.value = false;
    promotionMoveCache.value = null;
    lastChatMessage.value = null;
    mainPockets.value = null;
    matePockets.value = null;
    players.value = null;
    myBoardIdx.value = 0;
    gameStatus.value = null;
    clearClocks();
  };

  return {
    api,
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
