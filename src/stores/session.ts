import type { LobbyState, LobbyPlayerSlot } from '@/api/lobby/lobby.model';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type PlayerState = 'Idle' | 'Lobby' | 'Game';

export const useSessionStore = defineStore('session', () => {
  const state = ref<PlayerState>('Idle');
  const lobby = ref<LobbyState | null>(null);
  const gameId = ref<string | null>(null);

  const isIdle = computed(() => state.value === 'Idle');
  const isInLobby = computed(() => state.value === 'Lobby');
  const isInGame = computed(() => state.value === 'Game');

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
    ownerId: string,
    ownerSlot: LobbyPlayerSlot,
    time: number,
    increment: number,
  ) => {
    state.value = 'Lobby';
    lobby.value = {
      id: '',
      ownerId,
      time,
      increment,
      rated: false,
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

  return {
    state,
    lobby,
    gameId,
    isIdle,
    isInLobby,
    isInGame,
    setIdle,
    setLobby,
    setGame,
    setLobbyOptimistic,
    updateLobbySettings,
    updateLobbyPlayerSlot,
  };
});
