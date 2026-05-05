import type { Key } from '@lichess-org/chessground/types';
import { SquareSet } from 'chessops/squareSet';
import type { Color, Square } from 'chessops/types';
import { makeSquare, parseSquare } from 'chessops/util';
import type { ClockId } from '@/composables/useChessClocks';
import type { PocketData } from '@/api/chess/chess.model';
import { ChessError } from './chessError';

export function chessIdxToSqr(indexes: Square): Key;
export function chessIdxToSqr(indexes: Map<Square, SquareSet>): Map<Key, Key[]>;
export function chessIdxToSqr(indexes: Square | Map<Square, SquareSet>): Key | Map<Key, Key[]> {
  if (typeof indexes === 'number') return makeSquare(indexes);

  const result = new Map<Key, Key[]>();
  indexes.forEach((set, square) => {
    const key = makeSquare(square);
    const dests: Key[] = [];
    for (const sq of set) {
      dests.push(makeSquare(sq));
    }
    result.set(key, dests);
  });
  return result;
}

export function chessSqrToIdx(squares: Key): Square;
export function chessSqrToIdx(squares: Map<Key, Key[]>): Map<Square, SquareSet>;
export function chessSqrToIdx(squares: Key | Map<Key, Key[]>): Square | Map<Square, SquareSet> {
  if (typeof squares === 'string') return parseSquare(squares) ?? 0;

  const result = new Map<Square, SquareSet>();
  squares.forEach((keys, key) => {
    const square = parseSquare(key);
    if (square === undefined) throw new ChessError('Invalid square key: ' + key);
    let set = SquareSet.empty();

    for (const destKey of keys) {
      const destSquare = parseSquare(destKey);
      if (destSquare === undefined) throw new ChessError('Invalid square key: ' + destKey);
      set = set.with(destSquare);
    }

    result.set(square, set);
  });
  return result;
}

/** Returns true if `to` is the promotion rank for `color` (rank 8 for white, rank 1 for black). */
export function isFLLine(color: 'white' | 'black', to: Key): boolean;
/** Returns true if `to` is on either the first or last rank (rank 1 or rank 8), regardless of color. */
export function isFLLine(to: Key): boolean;
export function isFLLine(colorOrTo: 'white' | 'black' | Key, to?: Key): boolean {
  if (to !== undefined) {
    return (colorOrTo === 'white' && to[1] === '8') || (colorOrTo === 'black' && to[1] === '1');
  }
  return colorOrTo[1] === '8' || colorOrTo[1] === '1';
}

export const colorToClockId = (color: Color, board: 'main' | 'mate'): ClockId =>
  board === 'main'
    ? color === 'white'
      ? 'mainWhite'
      : 'mainBlack'
    : color === 'white'
      ? 'mateWhite'
      : 'mateBlack';

export const getEnPassantCaptureSquare = (to: Square, color: Color): Square =>
  to + (color === 'white' ? -8 : 8);

export const copyPocket = (pocket: PocketData): PocketData => ({
  pawn: pocket.pawn,
  knight: pocket.knight,
  bishop: pocket.bishop,
  rook: pocket.rook,
  queen: pocket.queen,
});
