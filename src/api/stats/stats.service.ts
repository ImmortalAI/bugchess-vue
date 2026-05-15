import apiClient from '@/utils/apiClient';
import type { PlatformStats, RatingDateRange, RatingDayFinal, RatingExtremes } from './stats.model';

const USE_MOCK_STATS = false;
const DAY_MS = 24 * 60 * 60 * 1000;
const MOCK_RATING_ALL_TIME_DAYS = 180;

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateParam(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getMockRatingForDate(date: Date) {
  const baselineDate = new Date('2025-01-01T00:00:00');
  const days = Math.floor((date.getTime() - baselineDate.getTime()) / DAY_MS);
  const longTrend = Math.sin(days / 31) * 80;
  const weeklySwing = Math.sin(days / 5) * 35;
  const volatility = Math.cos(days / 2.3) * 18;
  const tournamentBump = days % 17 === 0 ? 28 : 0;
  const lossStreak = days % 23 === 0 ? -35 : 0;

  return Math.round(1500 + longTrend + weeklySwing + volatility + tournamentBump + lossStreak);
}

function getMockStats(): PlatformStats {
  return {
    online_users: 42,
    available_players: 11,
    queued_players: 8,
    queued_lobbies: 3,
    active_games: 6,
  };
}

function getMockStatsRatingDayFinal(data: RatingDateRange): RatingDayFinal[] {
  const dateFrom = parseDateParam(data.date_from);
  const dateTo = parseDateParam(data.date_to);

  if (
    Number.isNaN(dateFrom.getTime()) ||
    Number.isNaN(dateTo.getTime()) ||
    dateFrom.getTime() > dateTo.getTime()
  ) {
    return [];
  }

  const dailyRatings: RatingDayFinal[] = [];

  for (let date = dateFrom; date.getTime() <= dateTo.getTime(); date = addDays(date, 1)) {
    dailyRatings.push({
      date: formatDateParam(date),
      rating: getMockRatingForDate(date),
    });
  }

  return dailyRatings;
}

function getMockStatsRatingExtremes(): RatingExtremes {
  const dateTo = new Date();
  const dateFrom = addDays(dateTo, -MOCK_RATING_ALL_TIME_DAYS);
  const dailyRatings = getMockStatsRatingDayFinal({
    date_from: formatDateParam(dateFrom),
    date_to: formatDateParam(dateTo),
  });
  const ratings = dailyRatings.map((item) => item.rating);
  const minimum = Math.min(...ratings);
  const maximum = Math.max(...ratings);

  return {
    minimum: {
      rating: minimum,
      dates: dailyRatings.filter((item) => item.rating === minimum).map((item) => item.date),
    },
    maximum: {
      rating: maximum,
      dates: dailyRatings.filter((item) => item.rating === maximum).map((item) => item.date),
    },
  };
}

export async function getStats(): Promise<PlatformStats> {
  if (USE_MOCK_STATS) return getMockStats();

  const response = await apiClient.get<PlatformStats>('/stats');
  return response.data;
}

export async function getStatsRatingExtremes(): Promise<RatingExtremes> {
  if (USE_MOCK_STATS) return getMockStatsRatingExtremes();

  const response = await apiClient.get<RatingExtremes>('/stats/rating/extremes');
  return response.data;
}

export async function getStatsRatingDayFinal(data: RatingDateRange): Promise<RatingDayFinal[]> {
  if (USE_MOCK_STATS) return getMockStatsRatingDayFinal(data);

  const response = await apiClient.get<RatingDayFinal[]>('/stats/rating/daily', { params: data });
  return response.data;
}
