<script setup lang="ts">
import ChessBoard from '@/components/chess/ChessBoard.vue';
import { Button } from '@/components/ui/button';
import { Chat } from '@/components/common/ChatComponent';
import type { ChatMessage } from '@/components/common/ChatComponent';
import { useTranslation } from '@/composables/useTranslation';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { ArrowLeftRight } from 'lucide-vue-next';
import { ref } from 'vue';
import type { Key, Piece } from '@lichess-org/chessground/types';
import type { Config } from '@lichess-org/chessground/config';
import PlayerPanel from '@/components/chess/PlayerPanel.vue';
import ChessClock from '@/components/chess/ChessClock.vue';

const isMobile = useBreakpoints(breakpointsTailwind).smaller('md');

const { t } = useTranslation();

const myBoardConfig: Config = {
  fen: '8/8/8/8/8/8/4P3/4K3',
  orientation: 'white',
  turnColor: 'white',
  movable: {
    free: false,
    color: 'white',
    dests: new Map<Key, Key[]>([['e2', ['e3', 'e4']]]),
  },
};

const mateBoardConfig: Config = {
  fen: '4k3/4p3/8/8/8/8/8/8',
  orientation: 'black',
  turnColor: 'black',
  movable: {
    color: undefined,
    dests: undefined,
  },
};

const mobileBoardConfig = ref<Config>(myBoardConfig);
const boardReversed = ref(false);

const onSwitchBoard = () => {
  mobileBoardConfig.value = boardReversed.value ? myBoardConfig : mateBoardConfig;
  boardReversed.value = !boardReversed.value;
};

const matchMessages = ref<ChatMessage[]>([]);

const isMsgPending = ref(false);

const matchNewMsg = async (message: string) => {
  isMsgPending.value = true;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  matchMessages.value.push({
    sender: 'Unknown',
    text: message,
    isOwn: true,
  });
  isMsgPending.value = false;

  simulateOpponentMsg('Привет! Твое сообщение: ' + message);
};

const simulateOpponentMsg = async (message: string) => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  matchMessages.value.push({
    sender: 'Opponent',
    text: message,
    isOwn: false,
  });
};

const onDropNewPiece = (piece: Piece, key: Key) => {
  console.log('drop new piece', piece, key);
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
  <div v-if="isMobile" class="w-full h-full flex flex-col justify-center items-center gap-2 px-2">
    <ChessBoard
      class="w-full"
      class-board="w-full aspect-square"
      :config="mobileBoardConfig"
      :is-promoting="false"
      pockets-orientation="horizontal"
      pockets-interactive
      @drop-new-piece="onDropNewPiece"
    >
      <template #pocket-top-extra>
        <ChessClock :remaining-ms="180000" />
      </template>
      <template #pocket-bottom-extra>
        <ChessClock :remaining-ms="180000" :active="true" />
      </template>
    </ChessBoard>
    <Button variant="outline" size="sm" @click="onSwitchBoard">
      <ArrowLeftRight />
    </Button>
  </div>

  <!-- Desktop layout -->
  <div v-else class="w-full h-full flex justify-center items-center gap-4">
    <!-- Left panel: player info + main board -->
    <div class="flex gap-2 items-center">
      <div class="flex flex-col justify-between h-(--cg-height) py-1">
        <PlayerPanel username="Opponent" :remaining-ms="180000" clock-position="bottom" />
        <PlayerPanel username="ImmortalAI" :remaining-ms="180000" :clock-active="true" clock-position="top" />
      </div>
      <ChessBoard
        class-board="w-(--cg-width) h-(--cg-height)"
        :is-promoting="false"
        pockets-orientation="vertical"
        pockets-interactive
        @drop-new-piece="onDropNewPiece"
        resizable
      />
    </div>

    <!-- Right panel: mate board + player info + chat -->
    <div class="flex flex-col gap-2">
      <ChessBoard class-board="size-96" :is-promoting="false" pockets-orientation="vertical" />
      <div class="flex gap-2 px-1">
        <PlayerPanel username="Partner" :remaining-ms="180000" :clock-active="true" class="flex-1 min-w-0" />
        <PlayerPanel username="Enemy" :remaining-ms="180000" clock-position="inline-start" class="flex-1 min-w-0" />
      </div>
      <Chat
        class="h-80"
        :title="t('chat.title')"
        :empty-placeholder="t('chat.empty')"
        :input-placeholder="t('chat.placeholder')"
        :messages="matchMessages"
        @send="matchNewMsg"
        :quick-messages="quickMessages"
      />
    </div>
  </div>
</template>
