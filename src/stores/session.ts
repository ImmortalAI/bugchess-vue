import { WsMsgType } from '@/api/websocket/websocket.model';
import type { UserState } from '@/api/session/session.model';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useWebSocketStore } from './ws';

export type PlayerState = 'Idle' | 'Lobby' | 'Game';

export const useSessionStore = defineStore('session', () => {
  const state = ref<PlayerState>('Idle');
  const initialized = ref(false);
  /** username of the player who sent an invite, null if no pending invite */
  const pendingInvite = ref<string | null>(null);

  const viewKey = ref<string>(crypto.randomUUID());

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

  const setState = (wsState: UserState) => {
    if (wsState === 'IDLE') state.value = 'Idle';
    else if (wsState === 'LOBBY') state.value = 'Lobby';
    else state.value = 'Game';
    initialized.value = true;
  };

  const setPendingInvite = (uid: string | null) => {
    pendingInvite.value = uid;
  };

  const returnToLobby = () => {
    useWebSocketStore().sendMessage({ type: WsMsgType.REQ_SYNC, data: {} });
    setLobby();
  };

  const updateView = () => (viewKey.value = crypto.randomUUID());

  return {
    state,
    initialized,
    pendingInvite,
    viewKey,
    isIdle,
    isInLobby,
    isInGame,
    setIdle,
    setLobby,
    setGame,
    setState,
    setPendingInvite,
    returnToLobby,
    updateView,
  };
});
