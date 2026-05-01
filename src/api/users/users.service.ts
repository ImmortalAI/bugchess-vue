import apiClient from '@/utils/apiClient';
import type { UserData, UserSearchResults } from './users.model';

export async function usersMe(): Promise<UserData> {
  const response = await apiClient.get<UserData>('/users/me');
  return response.data;
}

export async function usersActive(): Promise<UserSearchResults> {
  const response = await apiClient.get<UserSearchResults>('/users/active');
  return response.data;
}
