import apiClient from '@/utils/apiClient';
import type { AuthFormData, UserData } from './auth.model';
import type { ApiBaseResponse, ApiMessageResponse } from '../base/base.model';

export const authLogin = async (data: AuthFormData): Promise<ApiBaseResponse<UserData>> => {
  const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/auth/login`, data);
  return response.data;
};

export const authRegister = async (data: AuthFormData): Promise<ApiBaseResponse<UserData>> => {
  const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/auth/register`, data);
  return response.data;
};

export const authRefresh = async (): Promise<ApiBaseResponse<UserData>> => {
  const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/auth/refresh`);
  return response.data;
};

export const authLogout = async (): Promise<ApiBaseResponse<ApiMessageResponse>> => {
  const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/auth/logout`);
  return response.data;
};

export const authLogoutAll = async (): Promise<ApiBaseResponse<ApiMessageResponse>> => {
  const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/auth/logout-all`);
  return response.data;
};

export const userMe = async (): Promise<ApiBaseResponse<UserData>> => {
  const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/auth/me`);
  return response.data;
};
