<script setup lang="ts">
import ChessClockSlider from '@/components/chess/ChessClockSlider.vue';
import LobbyPlayer from '@/components/common/Lobby/LobbyPlayer.vue';
import InviteDialog from '@/components/common/Lobby/InviteDialog.vue';
import Button from '@/components/ui/button/Button.vue';
import ConfirmButton from '@/components/common/ConfirmButton.vue';
import Label from '@/components/ui/label/Label.vue';
import Switch from '@/components/ui/switch/Switch.vue';
import { usePageGuard } from '@/composables/usePageGuard';
import { useTranslation } from '@/composables/useTranslation';
import { useLobbyStore } from '@/stores/lobby';
import { useSessionStore } from '@/stores/session';
import { useAuthStore } from '@/stores/auth';
import { useWebSocketStore } from '@/stores/ws';
import { WsMsgType } from '@/api/websocket/websocket.model';
import type { LobbySlotIndex } from '@/api/lobby/lobby.model';
import { usersActive } from '@/api/users/users.service';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';

usePageGuard('Lobby');

const { t } = useTranslation();
const lobby = useLobbyStore();
const session = useSessionStore();
const auth = useAuthStore();
const ws = useWebSocketStore();

const router = useRouter();

const isLeader = computed(() => lobby.leader === auth.user?.username);

const canUpdateLobby = computed(() => isLeader.value && !lobby.inQueue);
const canPlayRating = computed(() => {
  if (!lobby.teamA || !lobby.teamB) return false;
  const count = (lobby.teamA[0] === null ? 0 : 1)
    + (lobby.teamA[1] === null ? 0 : 1)
    + (lobby.teamB[0] === null ? 0 : 1)
    + (lobby.teamB[1] === null ? 0 : 1);
  return count !== 3;
})

watch(canPlayRating, (value) => value && (lobby.rated = false));

const sendConfigUpdate = useDebounceFn(() => {
  ws.sendMessage({
    type: WsMsgType.LOBBY_CONFIG,
    data: { clockTime: lobby.time * 60000, incr: lobby.increment * 1000, rated: lobby.rated },
  });
}, 400);

const kickPlayer = (username: string | undefined) => {
  if (!username) return;
  ws.sendMessage({ type: WsMsgType.LOBBY_KICK, data: username });
};

const leaveLobby = () => {
  ws.sendMessage({ type: WsMsgType.LOBBY_LEAVE, data: {} });
  session.setIdle();
  lobby.clear();
  router.push('/');
};

const toggleMatchmaking = () => {
  if (lobby.inQueue) {
    ws.sendMessage({ type: WsMsgType.CANCEL_MM, data: {} });
  } else {
    ws.sendMessage({ type: WsMsgType.START_MM, data: {} });
  }
};

const inviteDialogOpen = ref(false);
const inviteSlotIdx = ref<LobbySlotIndex>(0);
const inviteUsers = ref<string[]>([]);

const openInviteDialog = async (slotIdx: LobbySlotIndex) => {
  inviteSlotIdx.value = slotIdx;
  inviteUsers.value = await usersActive();
  inviteDialogOpen.value = true;
};

const sendInvite = (username: string) => {
  ws.sendMessage({ type: WsMsgType.INVITE_SEND, data: { idx: inviteSlotIdx.value, username } });
};
</script>

<template>
  <div class="flex justify-center items-center w-full h-full p-4" :class="{ invisible: !session.initialized }">
    <div class="flex flex-col gap-8 p-8 border border-primary rounded-lg w-full sm:w-auto">
      <ChessClockSlider v-model:minutes="lobby.time" v-model:seconds="lobby.increment" :disabled="!canUpdateLobby"
        @update:minutes="sendConfigUpdate" @update:seconds="sendConfigUpdate" />
      <div class="flex gap-4 items-stretch">
        <div class="flex flex-col gap-2 flex-1 border border-border rounded-md p-3">
          <span class="text-xs font-medium text-muted-foreground text-center">{{
            t('lobby.team1')
            }}</span>
          <div class="flex flex-col gap-2 justify-end flex-1">
            <LobbyPlayer :username="lobby.teamA?.[0]?.username" :canKick="canUpdateLobby" :canInvite="canUpdateLobby"
              :isLeader="lobby.teamA?.[0]?.username === lobby.leader"
              :isMe="lobby.teamA?.[0]?.username === auth.user?.username" @kick="kickPlayer(lobby.teamA?.[0]?.username)"
              @invite="openInviteDialog(0)" />
            <LobbyPlayer :username="lobby.teamA?.[1]?.username" :canKick="canUpdateLobby" :canInvite="canUpdateLobby"
              :isLeader="lobby.teamA?.[1]?.username === lobby.leader"
              :isMe="lobby.teamA?.[1]?.username === auth.user?.username" @kick="kickPlayer(lobby.teamA?.[1]?.username)"
              @invite="openInviteDialog(1)" />
          </div>
        </div>
        <div class="flex flex-col gap-2 flex-1 border border-border rounded-md p-3">
          <span class="text-xs font-medium text-muted-foreground text-center">{{
            t('lobby.team2')
            }}</span>
          <div class="flex flex-col gap-2 justify-end flex-1">
            <LobbyPlayer :username="lobby.teamB?.[0]?.username" :canKick="canUpdateLobby" :canInvite="canUpdateLobby"
              :isLeader="lobby.teamB?.[0]?.username === lobby.leader"
              :isMe="lobby.teamB?.[0]?.username === auth.user?.username" @kick="kickPlayer(lobby.teamB?.[0]?.username)"
              @invite="openInviteDialog(2)" />
            <LobbyPlayer :username="lobby.teamB?.[1]?.username" :canKick="canUpdateLobby" :canInvite="canUpdateLobby"
              :isLeader="lobby.teamB?.[1]?.username === lobby.leader"
              :isMe="lobby.teamB?.[1]?.username === auth.user?.username" @kick="kickPlayer(lobby.teamB?.[1]?.username)"
              @invite="openInviteDialog(3)" />
          </div>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row sm:justify-between gap-3">
        <div class="flex items-center space-x-2">
          <Switch id="rating-switch" v-model="lobby.rated" :disabled="!canUpdateLobby || !canPlayRating"
            @update:modelValue="sendConfigUpdate" />
          <Label for="rating-switch">{{ t('lobby.rating') }}</Label>
        </div>
        <div class="flex gap-2">
          <ConfirmButton :label="t('lobby.leave')" :confirmLabel="t('lobby.leaveConfirm')" @confirm="leaveLobby" />
          <Button :variant="lobby.inQueue ? 'outline' : 'default'" :disabled="!isLeader" @click="toggleMatchmaking">
            {{ lobby.inQueue ? t('lobby.cancelSearch') : t('lobby.startGame') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
  <InviteDialog v-model:open="inviteDialogOpen" :users="inviteUsers" @invite="sendInvite" />
</template>
