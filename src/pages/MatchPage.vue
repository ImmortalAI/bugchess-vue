<script setup lang="ts">
import ChessBoard from '@/components/chess/ChessBoard.vue';
import { Button } from '@/components/ui/button';
import GameCtrlPanel from '@/components/common/GameCtrlPanel.vue';
import { usePageGuard } from '@/composables/usePageGuard';
import { useTranslation } from '@/composables/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useSessionStore } from '@/stores/session';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { ArrowLeftRight } from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref } from 'vue';
import type { Color } from '@lichess-org/chessground/types';
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
  <div v-if="isMobile" class="w-full h-full flex flex-col gap-2 py-2 overflow-y-auto"
    :class="{ invisible: !session.initialized }">
    <!-- Top player info -->
    <PlayerPanel :username="mobileTopPlayer?.username ?? '...'"
      :remaining-ms="game.clocks[mobileTopClockId].remainingMs" :clock-active="game.clocks[mobileTopClockId].active"
      :show-clock="false" class="px-2" />

    <!-- Both boards stay mounted so Chessground events.move keeps pocket sync working. -->
    <div class="w-full">
      <div :class="{ hidden: boardReversed }">
        <ChessBoard class="w-full" class-board="w-full aspect-square" class-pocket-row="px-2"
          :config="game.mainBoardState" :is-promoting="game.isPromoting" :promotion-color="game.promotionColor"
          :promotion-file="game.promotionFile" pockets-orientation="horizontal" pockets-interactive
          :pockets="mainMyPocket" :pockets-opponent="mainOpponentPocket" @ready="game.registerMainBoard"
          @promotion-select="game.promote">
          <template #pocket-top-extra>
            <ChessClock :remaining-ms="game.clocks[game.opponentClockId].remainingMs"
              :active="game.clocks[game.opponentClockId].active" />
          </template>
          <template #pocket-bottom-extra>
            <ChessClock :remaining-ms="game.clocks[game.myClockId].remainingMs"
              :active="game.clocks[game.myClockId].active" />
          </template>
        </ChessBoard>
      </div>

      <div :class="{ hidden: !boardReversed }">
        <ChessBoard class="w-full" class-board="w-full aspect-square" class-pocket-row="px-2"
          :config="game.mateBoardState" :is-promoting="false" :pockets="game.matePockets?.partner"
          :pockets-opponent="game.matePockets?.opponent" pockets-orientation="horizontal"
          @ready="game.registerMateBoard">
          <template #pocket-top-extra>
            <ChessClock :remaining-ms="game.clocks[game.enemyClockId].remainingMs"
              :active="game.clocks[game.enemyClockId].active" />
          </template>
          <template #pocket-bottom-extra>
            <ChessClock :remaining-ms="game.clocks[game.partnerClockId].remainingMs"
              :active="game.clocks[game.partnerClockId].active" />
          </template>
        </ChessBoard>
      </div>
    </div>

    <!-- Switch board (full width) -->
    <Button variant="outline" class="mx-2 gap-2" @click="onSwitchBoard">
      <ArrowLeftRight class="size-4" />
      {{ t('match.switchBoard') }}
    </Button>

    <!-- Mobile game controls: chat + resign + result -->
    <GameCtrlPanel class="px-2" :last-message="game.lastChatMessage" :game-status="game.gameStatus"
      :my-board-idx="game.myBoardIdx" :quick-messages="quickMessages" @send="matchNewMsg" @resign="game.resign()" />
  </div>

  <!-- Desktop layout -->
  <div v-else class="w-full h-full flex justify-center items-center gap-4" :class="{ invisible: !session.initialized }">
    <!-- Left panel: player info + main board -->
    <div class="flex gap-2 items-center">
      <div class="flex flex-col justify-between h-(--cg-height) py-1">
        <PlayerPanel :username="game.players?.opponent.username ?? '...'"
          :remaining-ms="game.clocks[game.opponentClockId].remainingMs"
          :clock-active="game.clocks[game.opponentClockId].active" clock-position="bottom" />
        <PlayerPanel :username="game.players?.me.username ?? '...'"
          :remaining-ms="game.clocks[game.myClockId].remainingMs" :clock-active="game.clocks[game.myClockId].active"
          clock-position="top" />
      </div>
      <ChessBoard class-board="w-(--cg-width) h-(--cg-height)" :config="game.mainBoardState"
        :is-promoting="game.isPromoting" :promotion-color="game.promotionColor" :promotion-file="game.promotionFile"
        :pockets="mainMyPocket" :pockets-opponent="mainOpponentPocket" pockets-orientation="vertical"
        pockets-interactive resizable @ready="game.registerMainBoard" @promotion-select="game.promote" />
    </div>

    <!-- Right panel: mate board + player info + chat -->
    <div class="flex flex-col gap-2">
      <ChessBoard class-board="size-96" :config="game.mateBoardState" :is-promoting="false"
        :pockets="game.matePockets?.partner" :pockets-opponent="game.matePockets?.opponent"
        pockets-orientation="vertical" @ready="game.registerMateBoard" />
      <div class="flex gap-2 px-1">
        <PlayerPanel :username="game.players?.partner.username ?? '...'"
          :remaining-ms="game.clocks[game.partnerClockId].remainingMs"
          :clock-active="game.clocks[game.partnerClockId].active" class="flex-1 min-w-0" />
        <PlayerPanel :username="game.players?.enemy.username ?? '...'"
          :remaining-ms="game.clocks[game.enemyClockId].remainingMs"
          :clock-active="game.clocks[game.enemyClockId].active" clock-position="inline-start" class="flex-1 min-w-0" />
      </div>
      <GameCtrlPanel class="w-96" :last-message="game.lastChatMessage" :game-status="game.gameStatus"
        :my-board-idx="game.myBoardIdx" :quick-messages="quickMessages" @send="matchNewMsg" @resign="game.resign()" />
    </div>
  </div>
</template>
