import apiClient from '@/utils/apiClient';
import type { I18nResponse } from '../base/base.model';
import type { AuthLoginData, AuthRegisterData } from './auth.model';

export async function authLogin(data: AuthLoginData): Promise<I18nResponse> {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
}

export async function authRegister(data: AuthRegisterData): Promise<I18nResponse> {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
}

export async function authLogout(): Promise<I18nResponse> {
  const response = await apiClient.post('/auth/logout');
  return response.data;
}

export async function authLogoutAll(): Promise<I18nResponse> {
  const response = await apiClient.post('/auth/logout_all');
  return response.data;
}
