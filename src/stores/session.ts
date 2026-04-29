import type { LobbyState, LobbyPlayerSlot } from '@/api/lobby/lobby.model';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type PlayerState = 'Idle' | 'Lobby' | 'Game';

export const useSessionStore = defineStore('session', () => {
  const state = ref<PlayerState>('Idle');
  const lobby = ref<LobbyState | null>(null);
  const gameId = ref<string | null>(null);
  /** username of the player who sent an invite, null if no pending invite */
  const pendingInvite = ref<string | null>(null);

  const isIdle = computed(() => state.value === 'Idle');
  const isInLobby = computed(() => state.value === 'Lobby');
  const isInGame = computed(() => state.value === 'Game');
  const isInQueue = computed(() => !!lobby.value?.inQueue);

  const setIdle = () => {
    state.value = 'Idle';
    lobby.value = null;
    gameId.value = null;
  };

  const setLobby = (lobbyState: LobbyState) => {
    state.value = 'Lobby';
    lobby.value = lobbyState;
    gameId.value = null;
  };

  const setGame = (id: string) => {
    state.value = 'Game';
    gameId.value = id;
    lobby.value = null;
  };

  const setLobbyOptimistic = (
    ownerSlot: LobbyPlayerSlot,
    time: number,
    increment: number,
  ) => {
    state.value = 'Lobby';
    lobby.value = {
      time,
      increment,
      rated: false,
      inQueue: false,
      myTeam: [ownerSlot, null],
      enemyTeam: [null, null],
    };
    gameId.value = null;
  };

  const updateLobbySettings = (
    settings: Partial<Pick<LobbyState, 'time' | 'increment' | 'rated'>>,
  ) => {
    if (!lobby.value) return;
    lobby.value = { ...lobby.value, ...settings };
  };

  const setMatchmaking = (active: boolean) => {
    if (!lobby.value) return;
    lobby.value = { ...lobby.value, inQueue: active };
  };

  const updateLobbyPlayerSlot = (
    teamKey: 'myTeam' | 'enemyTeam',
    slotIndex: 0 | 1,
    player: LobbyPlayerSlot,
  ) => {
    if (!lobby.value) return;
    const team = [...lobby.value[teamKey]] as LobbyState['myTeam'];
    team[slotIndex] = player;
    lobby.value = { ...lobby.value, [teamKey]: team };
  };

  const setPendingInvite = (uid: string | null) => {
    pendingInvite.value = uid;
  };

  return {
    state,
    lobby,
    gameId,
    pendingInvite,
    isIdle,
    isInLobby,
    isInGame,
    isInQueue,
    setIdle,
    setLobby,
    setGame,
    setLobbyOptimistic,
    updateLobbySettings,
    setMatchmaking,
    updateLobbyPlayerSlot,
    setPendingInvite,
  };
});
