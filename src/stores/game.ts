import { useChessClocks, type ClockId } from '@/composables/useChessClocks';
import { ChessError } from '@/utils/chessError';
import {
  chessIdxToSqr,
  colorToClockId,
  isFLLine,
  isGameStarted,
} from '@/utils/chessOpsGroundUtils';
import type { Config } from '@lichess-org/chessground/config';
import type { Key } from '@lichess-org/chessground/types';
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
import type { BughouseData, PlayerInfo, PocketData } from '@/api/chess/chess.model';
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

  const mainBoardState = shallowRef<Config | undefined>(undefined);
  const mateBoardState = shallowRef<Config | undefined>(undefined);

  const isPromoting = ref(false);
  const promotionMoveCache = ref<{ from: Square; to: Square } | null>(null);
  const chatMessages = ref<ChatMessage[]>([]);

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

  const pendingOpponentMove = ref<[Key, Key] | null>(null);

  const updateBoardState = (lastMove?: Key[]) => {
    if (!api.value) return;

    const turnColor = api.value.turn;
    const myColor = mainBoardState.value?.orientation;
    const isOurTurn = turnColor === myColor;
    const dests = isOurTurn ? chessIdxToSqr(api.value.allDests()) : new Map();
    const check = api.value.isCheck();
    const currentSetup = api.value.toSetup();

    mainBoardState.value = {
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
  };

  // In Bughouse, captured pieces go to the partner's board, not the capturer's pocket.
  // Restore pockets after every normal move to prevent chessops from incorrectly
  // crediting this board's pockets.
  const playNormal = (move: NormalMove) => {
    const pocketsBefore = api.value!.pockets!.clone();
    api.value!.play(move);
    api.value!.pockets = pocketsBefore;
  };

  // Returns the role of the piece captured by `move`, or null if no capture.
  // Must be called before play() while the board still reflects the pre-move state.
  const detectCapture = (move: NormalMove): Exclude<Role, 'king'> | null => {
    if (!api.value) return null;
    const piece = api.value.board.get(move.to);
    // Standard capture: destination square is occupied.
    if (piece) return (piece.promoted ? 'pawn' : piece.role) as Exclude<Role, 'king'>;
    // En passant: pawn moves to the ep square which is empty.
    if (move.to === api.value.epSquare) return 'pawn';
    return null;
  };

  const promote = (promotion: NormalMove['promotion']) => {
    if (!api.value) return;

    if (promotionMoveCache.value === null) {
      throw new ChessError('Promotion move cache is empty');
    }

    const { from, to } = promotionMoveCache.value;
    const uci = makeUci({ from, to, promotion });

    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: { idx: myBoardIdx.value, move: uci } });

    const capturedRole = detectCapture({ from, to, promotion });
    if (capturedRole && matePockets.value) matePockets.value.partner[capturedRole]++;
    playNormal({ from, to, promotion });
    pendingOpponentMove.value = null;
    updateBoardState([chessIdxToSqr(from), chessIdxToSqr(to)]);

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

    const capturedRole = detectCapture({ from, to });
    if (capturedRole && matePockets.value) matePockets.value.partner[capturedRole]++;
    playNormal({ from, to });
    pendingOpponentMove.value = null;
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

    pendingOpponentMove.value = null;
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
      // Normal move: captures must not go to this board's pockets in Bughouse.
      // The captured piece goes to the partner's opponent's pocket on the mate board.
      const capturedRole = detectCapture(parsed);
      if (capturedRole && matePockets.value) matePockets.value.opponent[capturedRole]++;
      playNormal(parsed);
      pendingOpponentMove.value = [chessIdxToSqr(parsed.from), chessIdxToSqr(parsed.to)];
      updateBoardState([chessIdxToSqr(parsed.from), chessIdxToSqr(parsed.to)]);
    } else {
      // Drop: chessops correctly decrements the opponent's pocket (initialized from cfg teams).
      api.value.play(parsed);
      if (mainPockets.value) mainPockets.value[moverColor][parsed.role as Exclude<Role, 'king'>]--;
      pendingOpponentMove.value = null;
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
      // Mate board: update lastMove display only (full pocket sync deferred).
      if (mateBoardState.value) {
        mateBoardState.value = {
          ...mateBoardState.value,
          lastMove: parseLastMove(data.move) ?? undefined,
        };
      }
    }
  };

  const addChatMessage = (sender: string, text: string, isOwn: boolean) => {
    chatMessages.value = [...chatMessages.value, { sender, text, isOwn }];
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
    pendingOpponentMove.value = null;
    clearClocks();
    if (mainBoardState.value) {
      mainBoardState.value = {
        ...mainBoardState.value,
        movable: { color: undefined, dests: new Map() },
      };
    }
  };

  const parseLastMove = (uci: string): Key[] | undefined => {
    if (!uci) return undefined;
    if (uci.includes('@')) return [uci.slice(uci.indexOf('@') + 1) as Key];
    return [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key];
  };

  /**
   * Initialize (or re-initialize) the full game state from a server snapshot.
   * Called on both fresh GAME_JOIN and SYNC while in a game.
   */
  const setup = (data: BughouseData | null, newGame?: boolean) => {
    // Clear state if server returned null (game not started yet).
    if (data === null) {
      clear();
      return;
    }

    // On sync do not clear messages in chat
    if (newGame) chatMessages.value = [];
    gameStatus.value = null;

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
      lastMove: mateBoard.lastMove ?? undefined,
    };
  };

  const clear = () => {
    api.value = null;
    mainBoardState.value = undefined;
    mateBoardState.value = undefined;
    isPromoting.value = false;
    promotionMoveCache.value = null;
    chatMessages.value = [];
    mainPockets.value = null;
    matePockets.value = null;
    players.value = null;
    myBoardIdx.value = 0;
    gameStatus.value = null;
    pendingOpponentMove.value = null;
    clearClocks();
  };

  return {
    api,
    clocks,
    isPromoting,
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
    chatMessages,
    pendingOpponentMove,
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
  };
});
