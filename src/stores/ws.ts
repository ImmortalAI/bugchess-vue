import { useWebSocket } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';
import { toast } from 'vue-sonner';
import { useGameStore } from './game';
import {
  WsMsgType,
  type WsIncomingData,
  type WsOutgoingData,
} from '@/api/websocket/websocket.model';
import { makeWsUrl } from '@/utils/wsUrl';

export const useWebSocketStore = defineStore('websocket', () => {
  const instance = shallowRef<ReturnType<typeof useWebSocket<WsIncomingData>> | null>(null);

  const initialized = computed(() => !!instance.value && instance.value.status.value === 'OPEN');

  const game = useGameStore();

  const connect = () => {
    if (instance.value) {
      if (instance.value.status.value !== 'CLOSED') return;

      instance.value.open();
      return;
    }

    instance.value = useWebSocket<WsIncomingData>(makeWsUrl(), {
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
      case WsMsgType.PING:
        sendMessage({ type: WsMsgType.PONG, data: {} });
        break;

      // LOBBY SERVER
      case WsMsgType.LOBBY_JOIN:
        // TODO: session.setLobby(data.data)
        break;
      case WsMsgType.LOBBY_KICKED:
        // TODO: session.setIdle()
        break;
      case WsMsgType.INVITE_RECEIVE:
        // TODO: session.receiveInvite(data.data)
        break;
      case WsMsgType.LOBBY_CONFIG_UPDATE:
        // TODO: session.updateLobbyConfig(data.data)
        break;
      case WsMsgType.LOBBY_START_MM:
        // TODO: session.startMatchmaking()
        break;
      case WsMsgType.LOBBY_CANCEL_MM:
        // TODO: session.cancelMatchmaking()
        break;

      // GAME SERVER
      case WsMsgType.GAME_JOIN:
        game.setup(data.data);
        break;
      case WsMsgType.GAME_SYNC:
        game.setup(data.data);
        break;
      case WsMsgType.GAME_OPPONENT_MOVE:
        // TODO: game.moveOpponent(data.data)
        break;
      case WsMsgType.GAME_MATE_BOARD_UPDATE:
        game.mateMove(data.data);
        break;
      case WsMsgType.GAME_CHAT_MSG_RECEIVE:
        // TODO: chat.receiveMessage(data.data)
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
