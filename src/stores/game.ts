import { ChessError } from '@/utils/chessError';
import { chessIdxToSqr, isFLLine } from '@/utils/chessOpsGroundUtils';
import type { Config } from '@lichess-org/chessground/config';
import type { Key, MoveMetadata } from '@lichess-org/chessground/types';
import { makeFen, parseFen } from 'chessops/fen';
import { Material } from 'chessops/setup';
import { makeUci, parseUci } from 'chessops/util';
import type { NormalMove, Role, Square } from 'chessops/types';
import { parseSquare } from 'chessops/util';
import { Crazyhouse } from 'chessops/variant';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import {
  WsMsgType,
  type WsMateMoveData,
  type WsMoveUciData,
} from '@/api/websocket/websocket.model';
import { useWebSocketStore } from './ws';
import type { BughouseConfig, PocketData } from '@/api/chess/chess.model';
import type { ChatMessage } from '@/components/common/ChatComponent/types';

export const useGameStore = defineStore('game', () => {
  const api = shallowRef<Crazyhouse | null>(null);

  const mainBoardState = shallowRef<Config | undefined>(undefined);
  const mateBoardState = shallowRef<Config | undefined>(undefined);

  const isPromoting = ref(false);
  const promotionMoveCache = ref<{ from: Square; to: Square } | null>(null);
  const chatMessages = ref<ChatMessage[]>([]);

  // Pockets of both players on the mate (partner's) board.
  // partner = pieces the partner can drop; opponent = pieces the partner's opponent can drop.
  const matePockets = shallowRef<{ partner: PocketData; opponent: PocketData } | null>(null);

  const ws = useWebSocketStore();

  const updateBoardState = (lastMove?: Key[]) => {
    if (!api.value) return;

    const dests = chessIdxToSqr(api.value.allDests());
    const check = api.value.isCheck();
    const turnColor = api.value.turn;
    const currentSetup = api.value.toSetup();

    mainBoardState.value = {
      ...mainBoardState.value,
      fen: makeFen(currentSetup),
      turnColor,
      movable: {
        color: turnColor,
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

    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: uci });

    const capturedRole = detectCapture({ from, to, promotion });
    if (capturedRole && matePockets.value) matePockets.value.partner[capturedRole]++;
    playNormal({ from, to, promotion });
    updateBoardState([chessIdxToSqr(from), chessIdxToSqr(to)]);

    promotionMoveCache.value = null;
    isPromoting.value = false;
  };

  const move = (orig: Key, dest: Key, meta: MoveMetadata) => {
    if (!api.value) return;

    if (meta.premove) return;

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
    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: uci });

    const capturedRole = detectCapture({ from, to });
    if (capturedRole && matePockets.value) matePockets.value.partner[capturedRole]++;
    playNormal({ from, to });
    updateBoardState([orig, dest]);
  };

  const drop = (role: Role, to: Key) => {
    if (!api.value) return;

    const toSq = parseSquare(to);
    if (toSq === undefined) {
      throw new ChessError('Invalid drop target: ' + to);
    }

    ws.sendMessage({ type: WsMsgType.GAME_MOVE, data: makeUci({ role, to: toSq }) });

    api.value.play({ role, to: toSq });
    updateBoardState([to]);
  };

  const moveOpponent = (uci: WsMoveUciData) => {
    if (!api.value) return;

    const parsed = parseUci(uci);
    if (!parsed) {
      throw new ChessError('Invalid opponent move UCI: ' + uci);
    }

    if ('from' in parsed) {
      // Normal move: captures must not go to this board's pockets in Bughouse.
      // The captured piece goes to the partner's opponent's pocket on the mate board.
      const capturedRole = detectCapture(parsed);
      if (capturedRole && matePockets.value) matePockets.value.opponent[capturedRole]++;
      playNormal(parsed);
      updateBoardState([chessIdxToSqr(parsed.from), chessIdxToSqr(parsed.to)]);
    } else {
      // Drop: chessops correctly decrements the opponent's pocket (initialized from cfg.p.opp)
      api.value.play(parsed);
      updateBoardState([chessIdxToSqr(parsed.to)]);
    }
  };

  const mateMove = (data: WsMateMoveData) => {
    if (!mateBoardState.value) return;

    mateBoardState.value = {
      ...mateBoardState.value,
      fen: data.fen,
      lastMove: data.lm,
    };

    if (data.pd && api.value?.pockets) {
      api.value.pockets[data.pd.c][data.pd.r]++;
      updateBoardState();
    }

    if (data.mpd && matePockets.value) {
      matePockets.value[data.mpd.s][data.mpd.r]--;
    }
  };

  const addChatMessage = (sender: string, text: string, isOwn: boolean) => {
    chatMessages.value = [...chatMessages.value, { sender, text, isOwn }];
  };

  const sendChatMessage = (text: string, senderName: string) => {
    ws.sendMessage({ type: WsMsgType.GAME_CHAT_MSG_SEND, data: { m: text } });
    addChatMessage(senderName, text, true);
  };

  const setup = (cfg: BughouseConfig) => {
    chatMessages.value = [];
    const parsedFen = parseFen(cfg.fen);
    if (parsedFen.isErr) {
      throw new ChessError('Invalid FEN: ' + cfg.fen);
    }

    const fenSetup = parsedFen.value;
    // Inject the player's pocket from server config — pockets in Bughouse are
    // managed cross-board and are not encoded in the position FEN.
    const pockets = Material.empty();
    const opponentColor = cfg.orn === 'white' ? 'black' : 'white';
    Object.assign(pockets[cfg.orn], cfg.p.my);
    Object.assign(pockets[opponentColor], cfg.p.opp);
    fenSetup.pockets = pockets;

    api.value = Crazyhouse.fromSetup(fenSetup).unwrap();

    const emptyPocket = (): PocketData => ({ pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 });
    matePockets.value = { partner: { ...cfg.p.mate }, opponent: emptyPocket() };

    const dests = chessIdxToSqr(api.value.allDests());
    const check = api.value.isCheck();
    const turnColor = api.value.turn;

    mainBoardState.value = {
      fen: cfg.fen,
      orientation: cfg.orn,
      turnColor,
      movable: {
        color: turnColor,
        dests,
        events: {
          after: move,
          afterNewPiece: drop,
        },
      },
      check,
    };

    mateBoardState.value = {
      fen: cfg.mFen,
      orientation: cfg.orn === 'white' ? 'black' : 'white',
      viewOnly: true,
    };
  };

  return {
    api,
    isPromoting,
    mainBoardState,
    mateBoardState,
    matePockets,
    chatMessages,
    setup,
    promote,
    move,
    drop,
    moveOpponent,
    mateMove,
    addChatMessage,
    sendChatMessage,
  };
});
