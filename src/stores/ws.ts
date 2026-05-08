import { useIntervalFn, useWebSocket } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';
import { toast } from 'vue-sonner';
import { useGameStore } from './game';
import { useSessionStore } from './session';
import { useLobbyStore } from './lobby';
import { useTranslation } from '@/composables/useTranslation';
import { WsMsgType, type WsIncomingMsg, type WsOutgoingMsg } from '@/api/websocket/websocket.model';
import { makeWsUrl } from '@/utils/wsUrl';
import router from '@/router';

export const useWebSocketStore = defineStore('websocket', () => {
  const instance = shallowRef<ReturnType<typeof useWebSocket<WsIncomingMsg>> | null>(null);

  const initialized = computed(() => !!instance.value && instance.value.status.value === 'OPEN');

  const game = useGameStore();
  const session = useSessionStore();
  const lobby = useLobbyStore();
  const { t } = useTranslation();

  const connect = () => {
    if (instance.value) {
      if (instance.value.status.value !== 'CLOSED') return;

      instance.value.open();
      return;
    }

    instance.value = useWebSocket<WsIncomingMsg>(makeWsUrl(), {
      heartbeat: {
        message: JSON.stringify({ type: WsMsgType.PING, data: {} }),
        scheduler: (cb) => useIntervalFn(cb, 5000),
        pongTimeout: 1000,
      },
      autoReconnect: {
        delay: 1000,
        retries: (retried) => {
          if (retried === 1) toast.error(t('ws.connectionLost'));
          return retried < 5;
        },
        onFailed() {
          toast.error(t('ws.connectionFailed'));
        },
      },
      onConnected() {
        console.log('WebSocket connected to game server.');
      },
      onError(_ws, e) {
        toast.error(t('ws.connectionError'));
        console.error('WebSocket error:', e);
      },
      onDisconnected(_ws, e) {
        toast.error(
          e?.reason ? t('ws.disconnectedWithReason', { reason: e.reason }) : t('ws.disconnected'),
        );
        console.error('WebSocket disconnected:', e);
      },
      onMessage: processMessage,
    });
  };

  const processMessage = (_ws: WebSocket, message: MessageEvent) => {
    let data: WsIncomingMsg;
    try {
      data = JSON.parse(message.data as string) as WsIncomingMsg;
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
        toast.warning(t('lobby.kicked'));
        break;
      case WsMsgType.INVITE_RECEIVE:
        session.setPendingInvite(data.data.username);
        break;
      case WsMsgType.LOBBY_INVITE_REJECTED:
        toast.info(t('ws.inviteDeclined', { username: data.data.username }));
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
          reason === 'kick' ? t('ws.playerKicked', { username }) : t('ws.playerLeft', { username }),
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
        game.addChatMessage(data.data.username, data.data.text, false);
        break;
      case WsMsgType.GAME_END:
        game.onGameEnd(data.data);
        break;

      // ERROR
      case WsMsgType.ERROR:
        toast.error(data.data.message ?? t('ws.serverError'));
        router.push('/');
        sendMessage({ type: WsMsgType.REQ_SYNC, data: {} });
        break;
    }
  };

  const sendMessage = (data: WsOutgoingMsg) => {
    if (!initialized.value) connect();

    instance.value?.send(JSON.stringify(data));
  };

  const disconnect = () => {
    instance.value?.close();
    instance.value = null;
  };

  return {
    initialized,
    instance,
    connect,
    disconnect,
    sendMessage,
  };
});
