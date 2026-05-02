import type { WsUserState } from '@/api/websocket/websocket.model';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type PlayerState = 'Idle' | 'Lobby' | 'Game';

export const useSessionStore = defineStore('session', () => {
  const state = ref<PlayerState>('Idle');
  const initialized = ref(false);
  /** username of the player who sent an invite, null if no pending invite */
  const pendingInvite = ref<string | null>(null);

  const isIdle = computed(() => state.value === 'Idle');
  const isInLobby = computed(() => state.value === 'Lobby');
  const isInGame = computed(() => state.value === 'Game');

  const setIdle = () => {
    state.value = 'Idle';
    initialized.value = true;
  };

  const setLobby = () => {
    state.value = 'Lobby';
    initialized.value = true;
  };

  const setGame = () => {
    state.value = 'Game';
    initialized.value = true;
  };

  const setState = (wsState: WsUserState) => {
    if (wsState === 'IDLE') state.value = 'Idle';
    else if (wsState === 'LOBBY') state.value = 'Lobby';
    else state.value = 'Game';
    initialized.value = true;
  };

  const setPendingInvite = (uid: string | null) => {
    pendingInvite.value = uid;
  };

  return {
    state,
    initialized,
    pendingInvite,
    isIdle,
    isInLobby,
    isInGame,
    setIdle,
    setLobby,
    setGame,
    setState,
    setPendingInvite,
  };
});
