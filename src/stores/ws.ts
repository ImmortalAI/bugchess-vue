import { useWebSocket } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { useAuthStore } from './auth';
import { useGameStore } from './game';
import type { WsIncomingData, WsOutgoingData } from '@/api/websocket/websocket.model';

export const useWebSocketStore = defineStore('websocket', () => {
  const instance = ref<ReturnType<typeof useWebSocket<WsIncomingData>> | null>(null);

  const initialized = computed(() => !!instance.value && instance.value.status === 'OPEN');

  const auth = useAuthStore();
  const game = useGameStore();

  const connect = () => {
    if (instance.value) {
      if (instance.value.status !== 'CLOSED') return;

      instance.value.open();
      return;
    }

    instance.value = useWebSocket<WsIncomingData>(`wss://example.com/api/stream/${auth.user?.id}`, {
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
      case 'move':
        game.moveOpponent(data.data);
        break;
      case 'drop':
        game.dropOpponent(data.data);
        break;
      case 'sync':
        game.sync(data.data);
        break;
      case 'mate_move':
        game.mateMove(data.data);
        break;
      case 'ping':
        sendMessage({ type: 'pong', data: {} });
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
