<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { ChessError } from '@/utils/chessError';
import ChessPromotion from '@/components/chess/ChessPromotion.vue';
import { cn } from '@/lib/utils';
import type { Config } from '@lichess-org/chessground/config';
import type { Color } from '@lichess-org/chessground/types';
import { Chessground } from '@lichess-org/chessground';
import ChessPockets from './ChessPockets.vue';
import type { PocketData } from '@/api/chess/chess.model';
import ChessBoardResizer from './ChessBoardResizer.vue';

interface ChessBoardProps {
  class?: string;
  classContainer?: string;
  classBoard?: string;
  classPromotion?: string;
  classPockets?: string;
  config?: Config;
  isPromoting: boolean;
  pocketsInteractive?: boolean;
  pocketsOrientation?: 'vertical' | 'horizontal';
  resizable?: boolean;
}

const props = defineProps<ChessBoardProps>();

const board = ref<HTMLElement | null>(null);
const api = shallowRef<ReturnType<typeof Chessground> | null>(null);

onMounted(() => {
  if (board.value === null) {
    throw new ChessError('Board element not found');
  }

  api.value = Chessground(board.value, props.config);
});

watch(
  () => props.config,
  (newValue) => {
    if (api.value === null || newValue === undefined) return;
    api.value.set(newValue);
  },
);

onBeforeUnmount(() => {
  if (api.value === null) return;
  api.value.destroy();
});

const onPocketPieceMousedown = (
  piece: keyof PocketData,
  color: Color,
  e: MouseEvent | TouchEvent,
) => {
  if (api.value === null) return;
  api.value.dragNewPiece({ role: piece, color }, e);
};

// TODO: replace with store data
const testPockets: PocketData = { pawn: 1, knight: 1, bishop: 1, rook: 3, queen: 1 };
const testPocketsOpponent: PocketData = { pawn: 2, knight: 1, bishop: 1, rook: 1, queen: 1 };
</script>

<template>
  <!-- Vertical pockets: board on left, pockets column on right -->
  <div
    v-if="pocketsOrientation === 'vertical'"
    :class="cn('relative grid grid-cols-[auto_auto] w-fit', props.class)"
  >
    <div class="relative w-fit h-fit">
      <div :class="cn('relative', props.classBoard)" ref="board"></div>
      <ChessBoardResizer v-if="props.resizable && !props.isPromoting" />
      <ChessPromotion v-if="isPromoting" :class="props.classPromotion" color="white" file="b" />
    </div>
    <ChessPockets
      :class="props.classPockets"
      color="white"
      :data="testPockets"
      :data-opponent="testPocketsOpponent"
      :interactive="pocketsInteractive"
      @piece-mousedown="onPocketPieceMousedown"
    />
  </div>

  <!-- Horizontal pockets: opponent pocket / board / player pocket stacked vertically -->
  <div
    v-else-if="pocketsOrientation === 'horizontal'"
    :class="cn('flex flex-col gap-1', props.class)"
  >
    <div class="flex justify-between items-center gap-2">
      <ChessPockets orientation="horizontal" color="black" :data="testPocketsOpponent" />
      <slot name="pocket-top-extra" />
    </div>
    <div :class="cn('relative w-full', props.classContainer)">
      <div :class="cn('relative', props.classBoard)" ref="board"></div>
      <ChessPromotion v-if="isPromoting" :class="props.classPromotion" color="white" file="b" />
    </div>
    <div class="flex justify-between items-center gap-2">
      <ChessPockets
        orientation="horizontal"
        :class="props.classPockets"
        color="white"
        :data="testPockets"
        :interactive="pocketsInteractive"
        @piece-mousedown="onPocketPieceMousedown"
      />
      <slot name="pocket-bottom-extra" />
    </div>
  </div>

  <!-- No pockets -->
  <div v-else :class="cn('relative w-fit h-fit', props.class)">
    <div :class="cn('relative', props.classBoard)" ref="board"></div>
    <ChessBoardResizer v-if="props.resizable && !props.isPromoting" />
    <ChessPromotion v-if="isPromoting" :class="props.classPromotion" color="white" file="b" />
  </div>
</template>
