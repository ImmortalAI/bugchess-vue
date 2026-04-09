import type { Key } from '@lichess-org/chessground/types';

export type BughouseConfig = {
  fen: string;
  mateFen: string;
  lastMove?: Key[];
  orientation: 'white' | 'black';
  winner?: 'white' | 'black';
};

export type PocketData = {
  pawn: number;
  knight: number;
  bishop: number;
  rook: number;
  queen: number;
};
