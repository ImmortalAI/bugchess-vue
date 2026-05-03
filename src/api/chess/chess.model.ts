import type { Color, Key } from '@lichess-org/chessground/types';
import { Chessground } from '@lichess-org/chessground';

/** Chessground API instance returned by the Chessground constructor. */
export type CgApi = ReturnType<typeof Chessground>;

/** Piece type that can be held in a pocket (all pieces except the King). Keys match the Role type from chessops/types. */
export type ChessPiece = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen';

/** Number of each piece type currently available for a drop move. */
export type PocketData = Record<ChessPiece, number>;

/** State of one player on a board: identity, clock, and pocket. */
export type PlayerData = {
  name: string;
  rating: number;
  color: Color;
  /** Remaining clock time in milliseconds. */
  clockTime: number;
  pocket: PocketData;
};

/** Complete snapshot of one of the two Bughouse boards. */
export type BoardData = {
  /** FEN string representing the current position. */
  fen: string;
  /** `[white player, black player]`. */
  players: [PlayerData, PlayerData];
  /** Squares of the last move — two squares normally, one square for a drop; null at game start. */
  lastMove: [Key, Key] | [Key] | null;
};

/** Identity and rating of a participant shown in the UI. */
export type PlayerInfo = { username: string; rating: number };

/** Full game state for both Bughouse boards, sent on join and sync. */
export type BughouseData = {
  /** `[board A, board B]`. */
  boards: [BoardData, BoardData];
  /** `null` while the game is in progress. */
  status: 'WinA' | 'WinB' | 'Draw' | 'Abort' | null;
};
