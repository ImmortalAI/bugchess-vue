<script setup lang="ts">
import { WsMsgType } from '@/api/websocket/websocket.model';
import GameInviteWidget from '@/components/common/GameInviteWidget.vue';
import TileButton from '@/components/common/TileButton.vue';
import Button from '@/components/ui/button/Button.vue';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useSessionStore } from '@/stores/session';
import { useWebSocketStore } from '@/stores/ws';
import { quickGameOptions, type QuickGameOption } from '@/utils/quickGameOptions';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const { t } = useTranslation();

const auth = useAuthStore();
const session = useSessionStore();
const ws = useWebSocketStore();
const router = useRouter();

const inviteVisible = computed(() => session.pendingInvite !== null);
const inviterUsername = computed(() => session.pendingInvite ?? '');

const onInviteAccept = () => {
  ws.sendMessage({ type: WsMsgType.INVITE_ACCEPT, data: {} });
  session.setPendingInvite(null);
};

const onInviteDecline = () => {
  ws.sendMessage({ type: WsMsgType.INVITE_REJECT, data: {} });
  session.setPendingInvite(null);
};

const isBlocked = computed(() => session.isInLobby || session.isInGame);

const createLobby = (option: QuickGameOption) => {
  if (isBlocked.value) return;

  if (!auth.isAuthenticated) {
    router.push('/signin');
    return;
  }

  const [minutesPart, incrementPart] = option.time.split('+').map(Number);
  const time = minutesPart ?? 3;
  const increment = incrementPart ?? 0;

  session.setLobbyOptimistic(
    { userId: auth.user!.id, username: auth.user!.username, rating: auth.user!.rating },
    time,
    increment,
  );

  ws.sendMessage({ type: WsMsgType.LOBBY_CREATE, data: { m: time, s: increment } });

  router.push('/lobby');
};
</script>

<template>
  <div class="relative w-full h-full">
    <img
      src="@/assets/imgs/logo.png"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 w-full h-full object-contain opacity-20 pointer-events-none select-none filter dark:invert-100"
    />

    <div
      class="relative w-full h-full flex items-start sm:items-center justify-center p-4 overflow-auto"
    >
      <div class="w-full max-w-lg flex flex-col gap-4">
        <div
          v-if="isBlocked"
          class="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/70 backdrop-blur-sm px-4 py-3"
        >
          <p class="text-sm text-muted-foreground">
            {{ session.isInLobby ? t('home.inLobby') : t('home.inGame') }}
          </p>
          <Button
            size="sm"
            class="w-full xs:w-auto shrink-0"
            @click="router.push(session.isInLobby ? '/lobby' : '/match')"
          >
            {{ session.isInLobby ? t('home.returnToLobby') : t('home.returnToGame') }}
          </Button>
        </div>

        <div class="w-full grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <TileButton
            v-for="option in quickGameOptions"
            :key="option.time"
            :title="option.time"
            :subtitle="t(option.name)"
            :disabled="isBlocked"
            @click="createLobby(option)"
          />
        </div>
      </div>
    </div>

    <GameInviteWidget
      :visible="inviteVisible"
      :inviter-username="inviterUsername"
      @accept="onInviteAccept"
      @decline="onInviteDecline"
    />
  </div>
</template>
