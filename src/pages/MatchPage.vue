<script setup lang="ts">
import ChessBoard from '@/components/chess/ChessBoard.vue';
import ChessBoardResizer from '@/components/chess/ChessBoardResizer.vue';
import ChessPockets from '@/components/chess/ChessPockets.vue';
import { Button } from '@/components/ui/button';
import GameCtrlPanel from '@/components/common/GameCtrlPanel.vue';
import { usePageGuard } from '@/composables/usePageGuard';
import { useBoardSize } from '@/composables/useBoardSize';
import { useTranslation } from '@/composables/useTranslation';
import { useQuickMessages } from '@/composables/useQuickMessages';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useSessionStore } from '@/stores/session';
import { breakpointsTailwind, useBreakpoints, useElementSize } from '@vueuse/core';
import { ArrowLeftRight } from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref } from 'vue';
import type { Color } from '@lichess-org/chessground/types';
import type { PocketData } from '@/api/chess/chess.model';
import PlayerPanel from '@/components/chess/PlayerPanel.vue';
import ChessClock from '@/components/chess/ChessClock.vue';

usePageGuard('Game');

const isMobile = useBreakpoints(breakpointsTailwind).smaller('md');

const { t } = useTranslation();

const auth = useAuthStore();
const game = useGameStore();
const session = useSessionStore();

const EMPTY_POCKET: PocketData = { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0 };
const MATE_BOARD_SIZE = 384;

// Desktop main board size (px), user-resizable and persisted.
const { boardSize, resizeBy } = useBoardSize();

// Mobile board size = width of the boards' container.
const mobileBoardArea = ref<HTMLElement | null>(null);
const { width: mobileBoardSize } = useElementSize(mobileBoardArea);

// The color played by "me" on the main board.
const myColor = computed<Color>(() => game.mainBoardState?.orientation ?? 'white');
const opponentColor = computed<Color>(() => (myColor.value === 'white' ? 'black' : 'white'));

// Pockets for the main board (me at bottom, opponent at top).
const mainMyPocket = computed(() => game.mainPockets?.[myColor.value]);
const mainOpponentPocket = computed(() => game.mainPockets?.[opponentColor.value]);

// Pockets for the mate board. Partner plays the opponent's color on the mate board.
const matePocketPartner = computed(() => game.matePockets?.[opponentColor.value]);
const matePocketOpponent = computed(() => game.matePockets?.[myColor.value]);

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

const { messages: quickMessages } = useQuickMessages();
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

    <!-- Both boards stay mounted (same grid cell, toggled via visibility) so Chessground
         keeps valid bounds and events.move pocket sync keeps working. -->
    <div ref="mobileBoardArea" class="grid w-full">
      <!-- Main board -->
      <div
        class="col-start-1 row-start-1 flex flex-col gap-1"
        :class="{ 'invisible pointer-events-none': boardReversed }"
      >
        <div class="flex justify-between items-center gap-2 px-2">
          <ChessPockets
            orientation="horizontal"
            :board-size="mobileBoardSize"
            :color="opponentColor"
            :data="mainOpponentPocket ?? EMPTY_POCKET"
          />
          <ChessClock
            :remaining-ms="game.clocks[game.opponentClockId].remainingMs"
            :active="game.clocks[game.opponentClockId].active"
          />
        </div>
        <ChessBoard
          :size="mobileBoardSize"
          :config="game.mainBoardState"
          :is-promoting="game.isPromoting"
          :promotion-color="game.promotionColor"
          :promotion-file="game.promotionFile"
          @ready="game.registerMainBoard"
          @promotion-select="game.promote"
        />
        <div class="flex justify-between items-center gap-2 px-2">
          <ChessPockets
            orientation="horizontal"
            :board-size="mobileBoardSize"
            :color="myColor"
            :data="mainMyPocket ?? EMPTY_POCKET"
            interactive
            @piece-mousedown="game.dragMainPocketPiece"
          />
          <ChessClock
            :remaining-ms="game.clocks[game.myClockId].remainingMs"
            :active="game.clocks[game.myClockId].active"
          />
        </div>
      </div>

      <!-- Mate board -->
      <div
        class="col-start-1 row-start-1 flex flex-col gap-1"
        :class="{ 'invisible pointer-events-none': !boardReversed }"
      >
        <div class="flex justify-between items-center gap-2 px-2">
          <ChessPockets
            orientation="horizontal"
            :board-size="mobileBoardSize"
            :color="myColor"
            :data="matePocketOpponent ?? EMPTY_POCKET"
          />
          <ChessClock
            :remaining-ms="game.clocks[game.enemyClockId].remainingMs"
            :active="game.clocks[game.enemyClockId].active"
          />
        </div>
        <ChessBoard
          :size="mobileBoardSize"
          :config="game.mateBoardState"
          @ready="game.registerMateBoard"
        />
        <div class="flex justify-between items-center gap-2 px-2">
          <ChessPockets
            orientation="horizontal"
            :board-size="mobileBoardSize"
            :color="opponentColor"
            :data="matePocketPartner ?? EMPTY_POCKET"
          />
          <ChessClock
            :remaining-ms="game.clocks[game.partnerClockId].remainingMs"
            :active="game.clocks[game.partnerClockId].active"
          />
        </div>
      </div>
    </div>

    <!-- Switch board (full width) -->
    <Button variant="outline" class="mx-2 gap-2" @click="onSwitchBoard">
      <ArrowLeftRight class="size-4" />
      {{ boardReversed ? t('match.switchToMainBoard') : t('match.switchToPartnerBoard') }}
    </Button>

    <!-- Mobile game controls: chat + resign + result -->
    <GameCtrlPanel
      class="px-2"
      :last-message="game.lastChatMessage"
      :game-status="game.gameStatus"
      :my-team-idx="game.myTeamIdx"
      :quick-messages="quickMessages"
      @send="matchNewMsg"
      @resign="game.resign()"
      @leave="session.returnToLobby"
    />
  </div>

  <!-- Desktop layout -->
  <div
    v-else
    class="w-full h-full flex justify-center items-center gap-4"
    :class="{ invisible: !session.initialized }"
  >
    <!-- Left panel: player info + main board + pockets -->
    <div class="flex gap-2 items-center">
      <div class="flex flex-col justify-between py-1" :style="{ height: `${boardSize}px` }">
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
      <div class="flex">
        <div class="relative">
          <ChessBoard
            :size="boardSize"
            :config="game.mainBoardState"
            :is-promoting="game.isPromoting"
            :promotion-color="game.promotionColor"
            :promotion-file="game.promotionFile"
            @ready="game.registerMainBoard"
            @promotion-select="game.promote"
          />
          <ChessBoardResizer v-if="!game.isPromoting" @resize="resizeBy" />
        </div>
        <ChessPockets
          :board-size="boardSize"
          :color="myColor"
          :data="mainMyPocket ?? EMPTY_POCKET"
          :data-opponent="mainOpponentPocket"
          interactive
          @piece-mousedown="game.dragMainPocketPiece"
        />
      </div>
    </div>

    <!-- Right panel: mate board + player info + chat -->
    <div class="flex flex-col gap-2">
      <div class="flex">
        <ChessBoard
          :size="MATE_BOARD_SIZE"
          :config="game.mateBoardState"
          @ready="game.registerMateBoard"
        />
        <ChessPockets
          :board-size="MATE_BOARD_SIZE"
          :color="opponentColor"
          :data="matePocketPartner ?? EMPTY_POCKET"
          :data-opponent="matePocketOpponent"
        />
      </div>
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
      <GameCtrlPanel
        class="w-96"
        :last-message="game.lastChatMessage"
        :game-status="game.gameStatus"
        :my-team-idx="game.myTeamIdx"
        :quick-messages="quickMessages"
        @send="matchNewMsg"
        @resign="game.resign()"
        @leave="session.returnToLobby"
      />
    </div>
  </div>
</template>
