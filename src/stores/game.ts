import { ChessError } from '@/utils/chessError';
import { chessIdxToSqr, isFLLine } from '@/utils/chessOpsGroundUtils';
import type { Config } from '@lichess-org/chessground/config';
import type { Key, MoveMetadata } from '@lichess-org/chessground/types';
import { makeFen, parseFen } from 'chessops/fen';
import type { NormalMove, Role, Square } from 'chessops/types';
import { parseSquare } from 'chessops/util';
import { Crazyhouse } from 'chessops/variant';
import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { WsDropData, WsMateMoveData, WsMoveData } from '@/api/websocket/websocket.model';
import { useWebSocketStore } from './ws';
import type { BughouseConfig } from '@/api/chess/chess.model';

export const useGameStore = defineStore('game', () => {
  const api = ref<Crazyhouse | null>(null);

  const mainBoardState = shallowRef<Config | undefined>(undefined);
  const mateBoardState = shallowRef<Config | undefined>(undefined);

  const isPromoting = ref(false);
  const promotionMoveCache = ref<{ from: Square; to: Square } | null>(null);

  const ws = useWebSocketStore();

  const updateBoardState = (lastMove?: Key[]) => {
    if (!api.value) return;

    const dests = chessIdxToSqr(api.value.allDests());
    const check = api.value.isCheck();
    const turnColor = api.value.turn;

    mainBoardState.value = {
      fen: makeFen(api.value.toSetup()),
      turnColor,
      movable: {
        color: turnColor,
        dests,
      },
      check,
      lastMove,
    };
  };

  const promote = (promotion: NormalMove['promotion']) => {
    if (!api.value) return;

    if (promotionMoveCache.value === null) {
      throw new ChessError('Promotion move cache is empty');
    }

    const { from, to } = promotionMoveCache.value;

    ws.sendMessage({
      type: 'move',
      data: {
        from: chessIdxToSqr(from),
        to: chessIdxToSqr(to),
        promotion,
      },
    });

    api.value.play({ from, to, promotion });
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

    ws.sendMessage({ type: 'move', data: { from: orig, to: dest } });

    api.value.play({ from, to });
    updateBoardState([orig, dest]);
  };

  const drop = (role: Role, to: Key) => {
    if (!api.value) return;

    const toSq = parseSquare(to);
    if (toSq === undefined) {
      throw new ChessError('Invalid drop target: ' + to);
    }

    ws.sendMessage({ type: 'drop', data: { role, to } });

    api.value.play({ role, to: toSq });
    updateBoardState([to]);
  };

  const moveOpponent = (data: WsMoveData) => {
    if (!api.value) return;

    const from = parseSquare(data.from),
      to = parseSquare(data.to);
    if (from === undefined || to === undefined) {
      throw new ChessError('Invalid opponent move keys: ' + data.from + ' -> ' + data.to);
    }

    api.value.play({ from, to, promotion: data.promotion });
    updateBoardState([data.from, data.to]);
  };

  const dropOpponent = (data: WsDropData) => {
    if (!api.value) return;

    const toSq = parseSquare(data.to);
    if (toSq === undefined) {
      throw new ChessError('Invalid opponent drop target: ' + data.to);
    }

    api.value.play({ role: data.role, to: toSq });
    updateBoardState([data.to]);
  };

  const mateMove = (data: WsMateMoveData) => {
    if (!mateBoardState.value) return;

    mateBoardState.value = {
      fen: data.fen,
      lastMove: data.lastMove,
    };
  };

  const setup = (cfg: BughouseConfig) => {
    const parsedFen = parseFen(cfg.fen);
    if (parsedFen.isErr) {
      throw new ChessError('Invalid FEN: ' + cfg.fen);
    }

    api.value = Crazyhouse.fromSetup(parsedFen.value).unwrap();

    const dests = chessIdxToSqr(api.value.allDests());
    const check = api.value.isCheck();
    const turnColor = api.value.turn;

    mainBoardState.value = {
      fen: cfg.fen,
      orientation: cfg.orientation,
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
      fen: cfg.mateFen,
      orientation: cfg.orientation === 'white' ? 'black' : 'white',
      viewOnly: true,
    };
  };

  const sync = (cfg: BughouseConfig) => {
    setup(cfg);
  };

  return {
    api,
    isPromoting,
    mainBoardState,
    mateBoardState,
    setup,
    sync,
    promote,
    move,
    drop,
    moveOpponent,
    dropOpponent,
    mateMove,
  };
});
