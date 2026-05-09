import type { BughouseData } from '../chess/chess.model';
import type { LobbyData } from '../lobby/lobby.model';

/** The high-level state a connected player can be in on the server. */
export type UserState = 'IDLE' | 'LOBBY' | 'GAME';

/** Server snapshot of the player's current state after connect, reconnect, or sync request. */
export type SessionSyncData = {
  state: UserState;
  /** Present when `state` is `LOBBY` or `GAME` and a lobby record exists. */
  lobby: LobbyData | null;
  /** Present when `state` is `GAME`. */
  game: BughouseData | null;
};
