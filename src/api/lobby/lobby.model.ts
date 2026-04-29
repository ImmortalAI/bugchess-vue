export type LobbyPlayerSlot = {
  userId?: string;
  username: string;
  rating: number;
} | null;

export type LobbyTeam = [LobbyPlayerSlot, LobbyPlayerSlot];

export type LobbyState = {
  time: number;
  increment: number;
  rated: boolean;
  myTeam: LobbyTeam;
  enemyTeam: LobbyTeam;
  /** matchmaking queue is active */
  inQueue: boolean;
};
