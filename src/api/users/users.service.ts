import apiClient from '@/utils/apiClient';
import type { UserData, UserSearchResult } from './users.model';

export async function usersMe(): Promise<UserData> {
  const response = await apiClient.get('/users/me');
  return response.data;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const response = await apiClient.get('/users/search', { params: { q: query } });
  return response.data;
}
