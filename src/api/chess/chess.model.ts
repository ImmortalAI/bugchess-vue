import type { Key } from '@lichess-org/chessground/types';

export type PocketData = {
  pawn: number;
  knight: number;
  bishop: number;
  rook: number;
  queen: number;
};

export type BughousePockets = {
  // Pockets on the main board
  my: PocketData;
  opponent: PocketData;
  // Partner's pocket on the second board (for display)
  mate: PocketData;
};

export type BughouseConfig = {
  fen: string;
  mateFen: string;
  //Last Move
  lm?: Key[];
  // Orientation
  orn: 'white' | 'black';
  // Pockets
  p: BughousePockets;
};
