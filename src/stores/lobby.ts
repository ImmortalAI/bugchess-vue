import type {
  LobbyData,
  LobbyPlayerLeaveData,
  LobbyPlayerSlot,
  LobbyTeam,
  LobbyTimeRatingData,
  LobbyUpdateSlot,
} from '@/api/lobby/lobby.model';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLobbyStore = defineStore('lobby', () => {
  /** Time control initial time in minutes. */
  const time = ref<number>(0);
  /** Time control increment in seconds. */
  const increment = ref<number>(0);
  const rated = ref<boolean>(false);
  const inQueue = ref<boolean>(false);
  /** Slots 0–1: Team A. */
  const teamA = ref<LobbyTeam | null>(null);
  /** Slots 2–3: Team B. */
  const teamB = ref<LobbyTeam | null>(null);
  /** Username of the lobby owner; only they can invite players. */
  const leader = ref<string | null>(null);

  /**
   * Replaces the entire lobby state with the server snapshot.
   * Passing `null` clears the store (same as `clear()`).
   *
   * Called by `ws.ts` on:
   * - `SYNC` — server sends the current state on connect/reconnect (lobbySnap may be null)
   * - `LOBBY_JOIN` — player successfully joined or created a lobby
   */
  const setState = (data: LobbyData | null) => {
    if (data === null) {
      clear();
      return;
    }

    time.value = data.initSec / 60000;
    increment.value = data.incrSec / 1000;
    rated.value = data.rated;
    inQueue.value = data.inQueue;
    teamA.value = [data.slots[0] ?? null, data.slots[1] ?? null] as LobbyTeam;
    teamB.value = [data.slots[2] ?? null, data.slots[3] ?? null] as LobbyTeam;
    leader.value = data.leader;
  };

  /**
   * Resets all lobby state to its initial empty values.
   *
   * Called by `ws.ts` on:
   * - `LOBBY_KICKED` — the local player was kicked by the lobby leader
   * - `GAME_JOIN` — a game started and the lobby is no longer active
   *
   * Also called internally when `setState(null)` is invoked.
   */
  const clear = () => {
    time.value = 0;
    increment.value = 0;
    rated.value = false;
    inQueue.value = false;
    teamA.value = null;
    teamB.value = null;
    leader.value = null;
  };

  /**
   * Updates a single slot when a player joins it.
   *
   * Called by `ws.ts` on:
   * - `LOBBY_PLAYER_JOIN` — a player filled a lobby slot
   */
  const updateSlot = (data: LobbyUpdateSlot) => {
    const team = data.idx < 2 ? teamA : teamB;
    if (!team.value) return;
    team.value[(data.idx % 2) as 0 | 1] = data.slot;
  };

  /**
   * Clears a single slot when a player leaves or is kicked.
   *
   * Called by `ws.ts` on:
   * - `LOBBY_PLAYER_LEAVE` — a player vacated a lobby slot
   */
  const clearSlot = (data: LobbyPlayerLeaveData) => {
    const team = data.idx < 2 ? teamA : teamB;
    if (!team.value) return;
    team.value[(data.idx % 2) as 0 | 1] = null;
  };

  /**
   * Applies an optimistic lobby state immediately after the local player sends
   * `LOBBY_CREATE`, before the server responds with `LOBBY_JOIN`.
   * This prevents a flash of empty state while waiting for the server.
   *
   * Called by `HomePage.vue` right after sending `LOBBY_CREATE`.
   */
  const setOptimistic = (ownerSlot: LobbyPlayerSlot, timeVal: number, incrementVal: number) => {
    time.value = timeVal;
    increment.value = incrementVal;
    rated.value = false;
    inQueue.value = false;
    teamA.value = [ownerSlot, null];
    teamB.value = [null, null];
    leader.value = ownerSlot?.username ?? null;
  };

  /**
   * Updates time control and the rated flag without touching player slots.
   *
   * Called by `ws.ts` on:
   * - `LOBBY_CONFIG_UPDATE` — the lobby leader changed the time control or rated setting
   */
  const updateSettings = (data: LobbyTimeRatingData) => {
    time.value = data.initSec / 60000;
    increment.value = data.incrSec / 1000;
    rated.value = data.rated;
  };

  /**
   * Toggles the matchmaking queue flag.
   *
   * Called by `ws.ts` on:
   * - `LOBBY_START_MM` (`active = true`) — matchmaking search started
   * - `LOBBY_CANCEL_MM` (`active = false`) — matchmaking search cancelled
   */
  const setMatchmaking = (active: boolean) => {
    inQueue.value = active;
  };

  /**
   * Parses a `"minutes+seconds"` string (e.g. `"5+3"`) into `time` and `increment`.
   * An empty string resets to 1+0. An invalid format resets both to 0.
   *
   * Called by time-control UI components when the user edits the time control field.
   */
  const setTime = (timeValue: string) => {
    if (timeValue === '') {
      time.value = 1;
      increment.value = 0;
      return;
    }

    const [minutes, inc] = timeValue.split('+').map(Number);

    if (minutes === undefined || inc === undefined || isNaN(minutes) || isNaN(inc)) {
      time.value = 0;
      increment.value = 0;
      return;
    }

    time.value = minutes;
    increment.value = inc;
  };

  return {
    time,
    increment,
    rated,
    inQueue,
    teamA,
    teamB,
    leader,
    setState,
    updateSlot,
    clearSlot,
    setOptimistic,
    updateSettings,
    setMatchmaking,
    clear,
    setTime,
  };
});
