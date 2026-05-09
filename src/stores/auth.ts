import type { AuthLoginData, AuthRegisterData } from '@/api/auth/auth.model';
import { authLogin, authLogout, authLogoutAll, authRegister } from '@/api/auth/auth.service';
import type { ActionResult, ApiErrorResponse } from '@/api/base/base.model';
import type { UserData } from '@/api/users/users.model';
import { usersMe } from '@/api/users/users.service';
import { isAxiosError } from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useGameStore } from './game';
import { useLobbyStore } from './lobby';
import { useWebSocketStore } from './ws';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  const ws = useWebSocketStore();

  const user = ref<UserData | null>(null);

  const initialized = ref(false);
  const isAuthenticated = computed(() => user.value !== null);

  const refresh = async (): Promise<ActionResult> => {
    try {
      user.value = await usersMe();
      ws.connect();
      return { isOk: true, message: '' };
    } catch (e) {
      if (user.value) {
        user.value = null;
      }
      if (isAxiosError(e)) {
        return {
          isOk: false,
          message:
            (e.response?.data as ApiErrorResponse)?.detail ??
            'Session expired, please log in again',
        };
      }
      return { isOk: false, message: 'User not logged in' };
    } finally {
      initialized.value = true;
    }
  };

  const register = async (formData: AuthRegisterData): Promise<ActionResult> => {
    try {
      const message = await authRegister(formData);
      await refresh();
      return { isOk: true, message };
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: false,
          message:
            (e.response?.data as ApiErrorResponse)?.detail ??
            (e.response?.data as string) ??
            'Error registering',
        };
      return { isOk: false, message: 'Unable to register: unknown error' };
    }
  };

  const login = async (loginData: AuthLoginData): Promise<ActionResult> => {
    try {
      const message = await authLogin(loginData);
      await refresh();
      return { isOk: true, message };
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: false,
          message: (e.response?.data as ApiErrorResponse)?.detail ?? 'Error logging in',
        };
      return { isOk: false, message: 'Unable to log in: unknown error' };
    }
  };

  const logout = async (): Promise<ActionResult> => {
    try {
      const message = await authLogout();
      user.value = null;
      useGameStore().clear();
      useLobbyStore().clear();
      useWebSocketStore().disconnect();
      router.push('/');
      return { isOk: true, message };
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: false,
          message: (e.response?.data as ApiErrorResponse)?.detail ?? 'Error logging out',
        };
      return { isOk: false, message: 'Unable to log out: unknown error' };
    }
  };

  const logoutAll = async (): Promise<ActionResult> => {
    try {
      const message = await authLogoutAll();
      user.value = null;
      useGameStore().clear();
      useLobbyStore().clear();
      useWebSocketStore().disconnect();
      router.push('/');
      return { isOk: true, message };
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: false,
          message:
            (e.response?.data as ApiErrorResponse)?.detail ?? 'Error logging out all sessions',
        };
      return { isOk: false, message: 'Unable to log out all sessions: unknown error' };
    }
  };

  return { user, isAuthenticated, initialized, refresh, register, login, logout, logoutAll };
});
