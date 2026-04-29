import type { Key } from '@lichess-org/chessground/types';

export type PocketData = {
  pawn: number;
  knight: number;
  bishop: number;
  rook: number;
  queen: number;
};

export type BughousePockets = {
  /** player's own pieces available to drop */
  my: PocketData;
  /** opponent's pieces available to drop (same board) */
  opp: PocketData;
  /** partner's pieces available to drop (mate board display) */
  mate: PocketData;
};

export type BughouseConfig = {
  /** main board position */
  fen: string;
  /** partner board position */
  mFen: string;
  /** last move as [from, to] squares */
  lm?: Key[];
  /** board orientation for this player */
  orn: 'white' | 'black';
  /** pocket state for all three sides */
  p: BughousePockets;
};
