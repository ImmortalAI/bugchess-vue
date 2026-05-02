<script setup lang="ts">
import ChessBoard from '@/components/chess/ChessBoard.vue';
import { Button } from '@/components/ui/button';
import { Chat } from '@/components/common/ChatComponent';
import { MobileChat } from '@/components/common/MobileChatComponent';
import { usePageGuard } from '@/composables/usePageGuard';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useSessionStore } from '@/stores/session';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { ArrowLeftRight } from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import type { Color } from '@lichess-org/chessground/types';
import type { CgApi } from '@/api/chess/chess.model';
import PlayerPanel from '@/components/chess/PlayerPanel.vue';
import ChessClock from '@/components/chess/ChessClock.vue';

usePageGuard('Game');

const isMobile = useBreakpoints(breakpointsTailwind).smaller('md');

const { t } = useTranslation();

const auth = useAuthStore();
const game = useGameStore();
const session = useSessionStore();

// The color played by "me" on the main board.
const myColor = computed<Color>(() => game.mainBoardState?.orientation ?? 'white');
const opponentColor = computed<Color>(() => (myColor.value === 'white' ? 'black' : 'white'));

// Pockets for the main board (me at bottom, opponent at top).
const mainMyPocket = computed(() => game.mainPockets?.[myColor.value]);
const mainOpponentPocket = computed(() => game.mainPockets?.[opponentColor.value]);

// Mobile: toggle between main board and mate board.
const boardReversed = ref(false);

const onSwitchBoard = () => {
  boardReversed.value = !boardReversed.value;
};

// On mobile the top player changes when switching boards.
const mobileTopPlayer = computed(() =>
  boardReversed.value ? game.players?.enemy : game.players?.opponent,
);
const mobileTopClockId = computed(() =>
  boardReversed.value ? game.enemyClockId : game.opponentClockId,
);
const mobileBottomClockId = computed(() =>
  boardReversed.value ? game.partnerClockId : game.myClockId,
);
const mobileBoardConfig = computed(() =>
  boardReversed.value ? game.mateBoardState : game.mainBoardState,
);
const mobilePockets = computed(() =>
  boardReversed.value ? game.matePockets?.partner : mainMyPocket.value,
);
const mobilePocketsOpponent = computed(() =>
  boardReversed.value ? game.matePockets?.opponent : mainOpponentPocket.value,
);

// Single Chessground instance shared by the mobile board — re-registered when switching views.
const mobileCgApi = shallowRef<CgApi | null>(null);

const onMobileBoardReady = (cgApi: CgApi) => {
  mobileCgApi.value = cgApi;
  game.registerMainBoard(cgApi);
};

watch(boardReversed, (reversed) => {
  if (!mobileCgApi.value) return;
  if (reversed) {
    game.unregisterMainBoard();
    game.registerMateBoard(mobileCgApi.value);
  } else {
    game.unregisterMateBoard();
    game.registerMainBoard(mobileCgApi.value);
  }
});

onBeforeUnmount(() => {
  game.unregisterMainBoard();
  game.unregisterMateBoard();
});

const matchNewMsg = (message: string) => {
  game.sendChatMessage(message, auth.user?.username ?? 'Me');
};

const quickMessages = [
  'Отличный ход!',
  'Отлично сыграли!',
  'Не ожидал такого хода.',
  'Твой ход.',
  'Хорошей игры!',
];
</script>

<template>
  <!-- Mobile layout -->
  <div
    v-if="isMobile"
    class="w-full h-full flex flex-col gap-2 py-2 overflow-y-auto"
    :class="{ invisible: !session.initialized }"
  >
    <!-- Top player info -->
    <PlayerPanel
      :username="mobileTopPlayer?.username ?? '...'"
      :remaining-ms="game.clocks[mobileTopClockId].remainingMs"
      :clock-active="game.clocks[mobileTopClockId].active"
      :show-clock="false"
      class="px-2"
    />

    <!-- Board with pockets and clocks inside slots -->
    <ChessBoard
      class="w-full"
      class-board="w-full aspect-square"
      class-pocket-row="px-2"
      :config="mobileBoardConfig"
      :is-promoting="!boardReversed && game.isPromoting"
      :promotion-color="game.promotionColor"
      :promotion-file="game.promotionFile"
      pockets-orientation="horizontal"
      :pockets-interactive="!boardReversed"
      :pockets="mobilePockets"
      :pockets-opponent="mobilePocketsOpponent"
      @ready="onMobileBoardReady"
      @promotion-select="game.promote"
    >
      <template #pocket-top-extra>
        <ChessClock
          :remaining-ms="game.clocks[mobileTopClockId].remainingMs"
          :active="game.clocks[mobileTopClockId].active"
        />
      </template>
      <template #pocket-bottom-extra>
        <ChessClock
          :remaining-ms="game.clocks[mobileBottomClockId].remainingMs"
          :active="game.clocks[mobileBottomClockId].active"
        />
      </template>
    </ChessBoard>

    <!-- Switch board (full width) -->
    <Button variant="outline" class="mx-2 gap-2" @click="onSwitchBoard">
      <ArrowLeftRight class="size-4" />
      {{ t('match.switchBoard') }}
    </Button>

    <!-- Mobile chat -->
    <MobileChat
      class="px-2"
      :messages="game.chatMessages"
      :quick-messages="quickMessages"
      @send="matchNewMsg"
    />
  </div>

  <!-- Desktop layout -->
  <div
    v-else
    class="w-full h-full flex justify-center items-center gap-4"
    :class="{ invisible: !session.initialized }"
  >
    <!-- Left panel: player info + main board -->
    <div class="flex gap-2 items-center">
      <div class="flex flex-col justify-between h-(--cg-height) py-1">
        <PlayerPanel
          :username="game.players?.opponent.username ?? '...'"
          :remaining-ms="game.clocks[game.opponentClockId].remainingMs"
          :clock-active="game.clocks[game.opponentClockId].active"
          clock-position="bottom"
        />
        <PlayerPanel
          :username="game.players?.me.username ?? '...'"
          :remaining-ms="game.clocks[game.myClockId].remainingMs"
          :clock-active="game.clocks[game.myClockId].active"
          clock-position="top"
        />
      </div>
      <ChessBoard
        class-board="w-(--cg-width) h-(--cg-height)"
        :config="game.mainBoardState"
        :is-promoting="game.isPromoting"
        :promotion-color="game.promotionColor"
        :promotion-file="game.promotionFile"
        :pockets="mainMyPocket"
        :pockets-opponent="mainOpponentPocket"
        pockets-orientation="vertical"
        pockets-interactive
        resizable
        @ready="game.registerMainBoard"
        @promotion-select="game.promote"
      />
    </div>

    <!-- Right panel: mate board + player info + chat -->
    <div class="flex flex-col gap-2">
      <ChessBoard
        class-board="size-96"
        :config="game.mateBoardState"
        :is-promoting="false"
        :pockets="game.matePockets?.partner"
        :pockets-opponent="game.matePockets?.opponent"
        pockets-orientation="vertical"
        @ready="game.registerMateBoard"
      />
      <div class="flex gap-2 px-1">
        <PlayerPanel
          :username="game.players?.partner.username ?? '...'"
          :remaining-ms="game.clocks[game.partnerClockId].remainingMs"
          :clock-active="game.clocks[game.partnerClockId].active"
          class="flex-1 min-w-0"
        />
        <PlayerPanel
          :username="game.players?.enemy.username ?? '...'"
          :remaining-ms="game.clocks[game.enemyClockId].remainingMs"
          :clock-active="game.clocks[game.enemyClockId].active"
          clock-position="inline-start"
          class="flex-1 min-w-0"
        />
      </div>
      <Chat
        class="h-80"
        :title="t('chat.title')"
        :empty-placeholder="t('chat.empty')"
        :input-placeholder="t('chat.placeholder')"
        :messages="game.chatMessages"
        @send="matchNewMsg"
        :quick-messages="quickMessages"
      />
    </div>
  </div>
</template>
