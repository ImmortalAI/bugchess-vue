import apiClient from '@/utils/apiClient';
import type { UserData, UserPatch, UserSearchResults } from './users.model';

export async function usersMe(): Promise<UserData> {
  const response = await apiClient.get<UserData>('/users/me');
  return response.data;
}

export async function usersActive(): Promise<UserSearchResults> {
  const response = await apiClient.get<UserSearchResults>('/users/active');
  return response.data;
}

export async function usersPatch(id: string, data: UserPatch): Promise<string> {
  const response = await apiClient.patch<string>(`/users/${id}`, data);
  return response.data;
}
