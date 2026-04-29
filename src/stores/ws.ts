import { useIntervalFn, useWebSocket } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';
import { toast } from 'vue-sonner';
import { useGameStore } from './game';
import { useSessionStore } from './session';
import {
  WsMsgType,
  type WsIncomingData,
  type WsOutgoingData,
  type WsSeatData,
  type WsLobbyStateData,
} from '@/api/websocket/websocket.model';
import type { LobbyState, LobbyPlayerSlot, LobbyTeam } from '@/api/lobby/lobby.model';
import { makeWsUrl } from '@/utils/wsUrl';

const mapSeat = (s: WsSeatData | null): LobbyPlayerSlot =>
  s ? { username: s.n, rating: s.r } : null;

const mapLobbyState = (d: WsLobbyStateData): LobbyState => {
  const onTeamB = d.p !== null && d.p >= 2;
  return {
    time: d.t.m,
    increment: d.t.s,
    rated: d.r,
    inQueue: d.q,
    myTeam: (onTeamB
      ? [mapSeat(d.s[2]), mapSeat(d.s[3])]
      : [mapSeat(d.s[0]), mapSeat(d.s[1])]) as LobbyTeam,
    enemyTeam: (onTeamB
      ? [mapSeat(d.s[0]), mapSeat(d.s[1])]
      : [mapSeat(d.s[2]), mapSeat(d.s[3])]) as LobbyTeam,
  };
};

export const useWebSocketStore = defineStore('websocket', () => {
  const instance = shallowRef<ReturnType<typeof useWebSocket<WsIncomingData>> | null>(null);

  const initialized = computed(() => !!instance.value && instance.value.status.value === 'OPEN');

  const game = useGameStore();
  const session = useSessionStore();
  const connect = () => {
    if (instance.value) {
      if (instance.value.status.value !== 'CLOSED') return;

      instance.value.open();
      return;
    }

    instance.value = useWebSocket<WsIncomingData>(makeWsUrl(), {
      heartbeat: {
        message: JSON.stringify({ type: WsMsgType.PING, data: {} }),
        scheduler: (cb) => useIntervalFn(cb, 5000),
        pongTimeout: 5000,
      },
      autoReconnect: {
        delay: 1000,
        retries: (retried) => {
          if (retried === 1) toast.error('Connection lost. Attempting to reconnect...');
          return retried < 5;
        },
        onFailed() {
          toast.error('Failed to connect to the game server after multiple attempts.');
        },
      },
      onConnected() {
        console.log('WebSocket connected to game server.');
      },
      onError(_ws, e) {
        toast.error('An error occurred with the game server.');
        console.error('WebSocket error:', e);
      },
      onDisconnected(_ws, e) {
        toast.error('Disconnected from the game server.' + (e ? ` Reason: ${e.reason}` : ''));
        console.error('WebSocket disconnected:', e);
      },
      onMessage: processMessage,
    });
  };

  const processMessage = (_ws: WebSocket, message: MessageEvent) => {
    let data: WsIncomingData;
    try {
      data = JSON.parse(message.data as string) as WsIncomingData;
    } catch {
      console.error('Failed to parse WebSocket message:', message.data);
      return;
    }

    switch (data.type) {
      // BASE
      case WsMsgType.PONG:
        break;

      // LOBBY SERVER
      case WsMsgType.LOBBY_JOIN:
        session.setLobby(mapLobbyState(data.data));
        break;
      case WsMsgType.LOBBY_KICKED:
        session.setIdle();
        break;
      case WsMsgType.INVITE_RECEIVE:
        session.setPendingInvite(data.data.n);
        break;
      case WsMsgType.LOBBY_CONFIG_UPDATE:
        session.updateLobbySettings({
          time: data.data.t.m,
          increment: data.data.t.s,
          rated: data.data.r,
        });
        break;
      case WsMsgType.LOBBY_START_MM:
        session.setMatchmaking(true);
        break;
      case WsMsgType.LOBBY_CANCEL_MM:
        session.setMatchmaking(false);
        break;

      // GAME SERVER
      case WsMsgType.GAME_JOIN:
        game.setup(data.data);
        break;
      case WsMsgType.GAME_SYNC:
        game.setup(data.data);
        break;
      case WsMsgType.GAME_OPPONENT_MOVE:
        game.moveOpponent(data.data);
        break;
      case WsMsgType.GAME_MATE_BOARD_UPDATE:
        game.mateMove(data.data);
        break;
      case WsMsgType.GAME_CHAT_MSG_RECEIVE:
        game.addChatMessage('Opponent', data.data.m, false);
        break;
    }
  };

  const sendMessage = (data: WsOutgoingData) => {
    if (!initialized.value) connect();

    instance.value?.send(JSON.stringify(data));
  };

  return {
    initialized,
    instance,
    connect,
    sendMessage,
  };
});
