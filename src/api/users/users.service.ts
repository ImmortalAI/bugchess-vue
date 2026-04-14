import apiClient from '@/utils/apiClient';
import type { UserData } from './users.model';

export async function usersMe(): Promise<UserData> {
  const response = await apiClient.get('/users/me');
  return response.data;
}
