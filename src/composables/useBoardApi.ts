import { Chessground } from '@lichess-org/chessground';

export const useBoardApi = (element: HTMLElement, viewOnly = false) => {
  const boardChessground = Chessground(element, {
    fen: config.fen,
    lastMove: config.lastMove ? config.lastMove : undefined,
    orientation: config.orientation,
    viewOnly: viewOnly,
    turnColor: api.value.turn,
    check: ch,
    movable: {
      dests: dests,
      events: {
        after: afterMove,
      },
    },
  });

  return {
    board: boardChessground,
  };
};
