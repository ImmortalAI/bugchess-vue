import type { AuthLoginData, AuthRegisterData } from '@/api/auth/auth.model';
import { authLogin, authLogout, authLogoutAll, authRegister } from '@/api/auth/auth.service';
import type { ActionResult } from '@/api/base/base.model';
import type { UserData } from '@/api/users/users.model';
import { usersMe } from '@/api/users/users.service';
import { isAxiosError } from 'axios';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserData | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  const refresh = async (): Promise<ActionResult> => {
    try {
      user.value = await usersMe();
      return { isOk: true, message: '' };
    } catch {
      if (user.value) {
        user.value = null;
        return { isOk: false, message: 'Session expired, please log in again' };
      }
      return { isOk: false, message: 'User not logged in' };
    }
  };

  const register = async (formData: AuthRegisterData): Promise<ActionResult> => {
    try {
      const message = await authRegister(formData);
      await refresh();
      return { isOk: true, message };
    } catch (e) {
      if (isAxiosError(e))
        return { isOk: false, message: (e.response?.data as string) ?? 'Error registering' };
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
        return { isOk: false, message: (e.response?.data as string) ?? 'Error logging in' };
      return { isOk: false, message: 'Unable to log in: unknown error' };
    }
  };

  const logout = async (): Promise<ActionResult> => {
    try {
      const message = await authLogout();
      user.value = null;
      return { isOk: true, message };
    } catch (e) {
      if (isAxiosError(e))
        return { isOk: false, message: (e.response?.data as string) ?? 'Error logging out' };
      return { isOk: false, message: 'Unable to log out: unknown error' };
    }
  };

  const logoutAll = async (): Promise<ActionResult> => {
    try {
      const message = await authLogoutAll();
      user.value = null;
      return { isOk: true, message };
    } catch (e) {
      if (isAxiosError(e))
        return {
          isOk: false,
          message: (e.response?.data as string) ?? 'Error logging out all sessions',
        };
      return { isOk: false, message: 'Unable to log out all sessions: unknown error' };
    }
  };

  return { user, isAuthenticated, refresh, register, login, logout, logoutAll };
});
