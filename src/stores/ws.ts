import { useIntervalFn, useWebSocket } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';
import { toast } from 'vue-sonner';
import { useGameStore } from './game';
import { useSessionStore } from './session';
import { useLobbyStore } from './lobby';
import {
  WsMsgType,
  type WsIncomingData,
  type WsOutgoingData,
} from '@/api/websocket/websocket.model';
import { makeWsUrl } from '@/utils/wsUrl';
import router from '@/router';

export const useWebSocketStore = defineStore('websocket', () => {
  const instance = shallowRef<ReturnType<typeof useWebSocket<WsIncomingData>> | null>(null);

  const initialized = computed(() => !!instance.value && instance.value.status.value === 'OPEN');

  const game = useGameStore();
  const session = useSessionStore();
  const lobby = useLobbyStore();

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
        pongTimeout: 1000,
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
      case WsMsgType.SYNC: {
        const { state, lobby: lobbySnap, game: gameSnap } = data.data;
        session.setState(state);
        lobby.setState(lobbySnap);
        game.setup(gameSnap);
        break;
      }

      // LOBBY SERVER
      case WsMsgType.LOBBY_JOIN:
        session.setLobby();
        lobby.setState(data.data);
        router.push('/lobby');
        break;
      case WsMsgType.LOBBY_KICKED:
        session.setIdle();
        lobby.clear();
        break;
      case WsMsgType.INVITE_RECEIVE:
        session.setPendingInvite(data.data.username);
        break;
      case WsMsgType.LOBBY_INVITE_REJECTED:
        toast.info(`${data.data.username} declined your invite`);
        break;
      case WsMsgType.LOBBY_CONFIG_UPDATE:
        lobby.updateSettings(data.data);
        break;
      case WsMsgType.LOBBY_START_MM:
        lobby.setMatchmaking(true);
        break;
      case WsMsgType.LOBBY_CANCEL_MM:
        lobby.setMatchmaking(false);
        break;
      case WsMsgType.LOBBY_PLAYER_JOIN:
        lobby.updateSlot(data.data);
        break;
      case WsMsgType.LOBBY_PLAYER_LEAVE: {
        const { idx, reason } = data.data;
        const team = idx < 2 ? lobby.teamA : lobby.teamB;
        const username = team?.[(idx % 2) as 0 | 1]?.username ?? 'A player';
        lobby.clearSlot(data.data);
        toast.info(
          reason === 'kick'
            ? `${username} was kicked from the lobby`
            : `${username} left the lobby`,
        );
        break;
      }

      // GAME SERVER
      case WsMsgType.GAME_JOIN:
        game.setup(data.data);
        session.setGame();
        if (router.currentRoute.value.name === 'Lobby') router.push('/match');
        break;
      case WsMsgType.GAME_MOVE_RECEIVE:
        game.receiveMove(data.data);
        break;
      case WsMsgType.GAME_CHAT_MSG_RECEIVE:
        game.addChatMessage('Opponent', data.data, false);
        break;
      case WsMsgType.GAME_END:
        game.onGameEnd(data.data);
        break;

      // ERROR
      case WsMsgType.ERROR:
        toast.error(data.data.message ?? 'Server error');
        router.push('/');
        sendMessage({ type: WsMsgType.REQ_SYNC, data: {} });
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
