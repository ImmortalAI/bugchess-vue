import type { Color, Key } from '@lichess-org/chessground/types';
import { Chessground } from '@lichess-org/chessground';
import type { Role } from 'chessops/types';
import type { MaterialSide } from 'chessops/setup';

/** Chessground API instance returned by the Chessground constructor. */
export type CgApi = ReturnType<typeof Chessground>;

/** Which of the two Bughouse boards an event belongs to: `0` = board A, `1` = board B. */
export type BoardIndex = 0 | 1;

/** Final result values returned by the server when a game is no longer in progress. */
export type GameResultStatus = 'WinA' | 'WinB' | 'Draw' | 'Abort';

/** Current Bughouse game status; `null` means the game is still active. */
export type BughouseStatus = GameResultStatus | null;

/** Squares of the last move: two squares normally, one square for a drop, or `null` at game start. */
export type LastMoveData = [Key, Key] | [Key] | null;

/** Piece roles that can be stored in a Bughouse/Crazyhouse pocket. */
export type ChessPiece = Exclude<Role, 'king'>;

/** Number of each piece type currently available for a drop move. */
export type PocketData = Pick<MaterialSide, ChessPiece>;

/** State of one player on a board: identity, color, and clock. */
export type PlayerData = {
  name: string;
  rating: number;
  color: Color;
  /** Remaining clock time in milliseconds. */
  clockTime: number;
};

/** Complete snapshot of one of the two Bughouse boards. */
export type BoardData = {
  /** FEN string representing the current position. */
  fen: string;
  /** `[white player, black player]`. */
  players: [PlayerData, PlayerData];
  /** Squares of the last move — two squares normally, one square for a drop; null at game start. */
  lastMove: LastMoveData;
  /** UTC timestamp (ms) by which both players must make their first move or the game is aborted; null after the game has started. */
  autoAbortAt: number | null;
};

/** Identity and rating of a participant shown in the UI. */
export type PlayerInfo = { username: string; rating: number };

/** Full game state for both Bughouse boards, sent on join and sync. */
export type BughouseData = {
  /** `[board A, board B]`. */
  boards: [BoardData, BoardData];
  /** `null` while the game is in progress. */
  status: BughouseStatus;
  /** Time increment per move in milliseconds. */
  incr: number;
};

/** A single move on one of the two Bughouse boards. */
export type GameMoveData = {
  idx: BoardIndex;
  /** Move in UCI notation, for example `e2e4` or `P@f7` for a drop. */
  move: string;
};

/** Move broadcast from the server with synchronized clock values for the moved board. */
export type GameMoveReceiveData = GameMoveData & {
  /** Remaining time for white on the moved board, in milliseconds. */
  whiteClockTime: number;
  /** Remaining time for black on the moved board, in milliseconds. */
  blackClockTime: number;
};

/** Chat message received during an active game. */
export type GameChatMessageData = {
  username: string;
  text: string;
};

/** Final game result and per-player rating deltas. */
export type GameEndData = {
  status: GameResultStatus;
  /** Username to rating delta; empty object for casual games. */
  ratingChanges: Record<string, number>;
};
