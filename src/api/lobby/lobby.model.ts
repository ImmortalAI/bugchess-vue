export type LobbyPlayerSlot = {
  userId: string;
  username: string;
  rating: number;
} | null;

export type LobbyTeam = [LobbyPlayerSlot, LobbyPlayerSlot];

export type LobbyState = {
  id: string;
  ownerId: string;
  time: number;
  increment: number;
  rated: boolean;
  myTeam: LobbyTeam;
  enemyTeam: LobbyTeam;
};
