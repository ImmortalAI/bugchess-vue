import type { AuthFormData, UserData } from '@/api/auth/auth.model';
import {
  authLogin,
  authLogout,
  authLogoutAll,
  authRegister,
  userMe,
} from '@/api/auth/auth.service';
import type {
  ApiBaseErrorResponse,
  ApiBaseSuccessResponse,
  ApiMessageResponse,
} from '@/api/base/base.model';
import { isAxiosError } from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserData | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  const refresh = async (): Promise<null | string> => {
    try {
      const userReturned = await userMe();
      if (!userReturned.success) return userReturned.error;

      user.value = userReturned.data;
      return null;
    } catch {
      if (user.value) {
        user.value = null;
        return 'Session expired, please log in again';
      }
      return 'User not logged in';
    }
  };

  const register = async (formData: AuthFormData): Promise<{ isOk: boolean; message: string }> => {
    try {
      const result = await authRegister(formData);

      return {
        isOk: true,
        message:
          (result as ApiBaseSuccessResponse<UserData>).data.username + ' registered successfully',
      };
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: true,
          message:
            (e.response?.data as ApiBaseErrorResponse | undefined)?.error ?? 'Error logging in',
        };

      return { isOk: true, message: 'Unable to log in: unknown error' };
    }
  };

  const login = async (loginData: AuthFormData): Promise<{ isOk: boolean; message: string }> => {
    try {
      const result = await authLogin(loginData);
      await refresh();
      return {
        isOk: true,
        message:
          (result as ApiBaseSuccessResponse<UserData>).data.username + ' logged in successfully',
      };
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: true,
          message:
            (e.response?.data as ApiBaseErrorResponse | undefined)?.error ?? 'Error logging in',
        };

      return { isOk: true, message: 'Unable to log in: unknown error' };
    }
  };

  const logout = async () => {
    try {
      const result = await authLogout();
      user.value = null;

      return (result as ApiBaseSuccessResponse<ApiMessageResponse>).data.message;
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: true,
          message:
            (e.response?.data as ApiBaseErrorResponse | undefined)?.error ?? 'Error logging out',
        };

      return { isOk: true, message: 'Unable to log out: unknown error' };
    }
  };

  const logoutAll = async () => {
    try {
      const result = await authLogoutAll();
      user.value = null;

      return (result as ApiBaseSuccessResponse<ApiMessageResponse>).data.message;
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: true,
          message:
            (e.response?.data as ApiBaseErrorResponse | undefined)?.error ??
            'Error logging out all sessions',
        };

      return { isOk: true, message: 'Unable to log out all sessions: unknown error' };
    }
  };

  return { user, isAuthenticated, register, login, logout, logoutAll, refresh };
});
