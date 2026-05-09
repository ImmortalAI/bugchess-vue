/** Valid index of a player slot in a 4-player lobby. */
export type LobbySlotIndex = 0 | 1 | 2 | 3;

/** Why a player slot became empty. */
export type LobbyPlayerLeaveReason = 'leave' | 'kick';

/** Player identity shown in a lobby slot. */
export type LobbyPlayerData = {
  username: string;
  rating: number;
};

/** One player seat in the lobby; `null` when the seat is empty. */
export type LobbyPlayerSlot = LobbyPlayerData | null;

/** A pair of player slots that form one team (indices 0–1 for team A, 2–3 for team B). */
export type LobbyTeam = [LobbyPlayerSlot, LobbyPlayerSlot];

/** Clock settings shared by lobby creation and config messages. */
export type LobbyTimeData = {
  /** Starting clock time in milliseconds. */
  clockTime: number;
  /** Clock increment per move in milliseconds. */
  incr: number;
};

/** Clock settings plus the rated/casual flag. */
export type LobbyTimeRatingData = LobbyTimeData & {
  rated: boolean;
};

/** Full lobby state sent by the server on join and sync. */
export type LobbyData = LobbyTimeRatingData & {
  /** Whether the lobby is currently searching for an opponent via matchmaking. */
  inQueue: boolean;
  /** Player slots 0–3: indices 0–1 are team A, indices 2–3 are team B. */
  slots: [LobbyPlayerSlot, LobbyPlayerSlot, LobbyPlayerSlot, LobbyPlayerSlot];
  /** Username of the lobby owner who can kick players and change config. */
  leader: string;
};

/** Lobby invite target: the destination slot and invited username. */
export type LobbyInviteData = {
  idx: LobbySlotIndex;
  username: string;
};

/** Partial update for a single lobby slot sent by `LOBBY_PLAYER_JOIN`. */
export type LobbyUpdateSlot = {
  /** Slot index (0–3). */
  idx: LobbySlotIndex;
  slot: LobbyPlayerData;
};

/** Payload for `LOBBY_PLAYER_LEAVE`: which slot emptied and why. */
export type LobbyPlayerLeaveData = {
  idx: LobbySlotIndex;
  reason: LobbyPlayerLeaveReason;
};
