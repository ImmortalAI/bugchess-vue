export type PlatformStats = {
  online_users: number;
  available_players: number;
  queued_players: number;
  queued_lobbies: number;
  active_games: number;
};

export type RatingMinMaxExtreme = {
  rating: number;
  dates: string[];
};

export type RatingExtremes = {
  minimum: RatingMinMaxExtreme;
  maximum: RatingMinMaxExtreme;
};

export type RatingDateRange = {
  date_from: string;
  date_to: string;
};

export type RatingDayFinal = {
  date: string;
  rating: number;
};
