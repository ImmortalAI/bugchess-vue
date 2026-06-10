<script setup lang="ts">
import type { PocketData } from '@/api/chess/chess.model';
import type { Color } from '@lichess-org/chessground/types';
import { cn } from '@/lib/utils';
import { computed } from 'vue';
import DraggablePiece from './DraggablePiece.vue';

interface PocketProps {
  class?: string;
  orientation?: 'vertical' | 'horizontal';
  /** Edge length in px of the board this pocket belongs to. */
  boardSize: number;
  color: Color;
  data: PocketData;
  /** Vertical layout only: opponent's pieces shown read-only on top. */
  dataOpponent?: PocketData;
  interactive?: boolean;
}

const pieces: (keyof PocketData)[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];

// p-1 padding (4px per side) and the gap-1 (4px) between the two vertical halves.
const PADDING = 8;
const HALVES_GAP = 4;

const props = defineProps<PocketProps>();

const emit = defineEmits<{
  pieceMousedown: [piece: keyof PocketData, color: Color, event: MouseEvent | TouchEvent];
}>();

const colorOpponent = computed<Color>(() => (props.color === 'white' ? 'black' : 'white'));
const isHorizontal = computed(() => props.orientation === 'horizontal');

// Pocket width (vertical) / height (horizontal) equals one board square.
const squareSize = computed(() => Math.floor(props.boardSize / 8));

// Vertical: 10 piece slots (2×5) stacked inside boardSize height.
const verticalPieceSize = computed(() =>
  Math.min(Math.floor((props.boardSize - PADDING - HALVES_GAP) / 10), squareSize.value - PADDING),
);
const horizontalPieceSize = computed(() => squareSize.value - PADDING);
</script>

<template>
  <!-- Horizontal layout: single strip of pieces in a row, one square tall -->
  <div
    v-if="isHorizontal"
    :class="
      cn('flex flex-row w-fit rounded-md border border-border bg-pocket p-1 gap-1', props.class)
    "
    :style="{ height: `${squareSize}px` }"
  >
    <template v-for="p in pieces" :key="p">
      <DraggablePiece
        :piece="p"
        :color="props.color"
        :count="data[p]"
        :size="horizontalPieceSize"
        :interactive="interactive"
        @piece-mousedown="emit('pieceMousedown', p, props.color, $event)"
      />
    </template>
  </div>

  <!-- Vertical layout: one square wide, board height; opponent on top, player on bottom -->
  <div
    v-else
    :class="
      cn('ml-1 flex flex-col rounded-md border border-border bg-pocket p-1 gap-1', props.class)
    "
    :style="{ width: `${squareSize}px`, height: `${boardSize}px` }"
  >
    <!-- Opponent's captured pieces (top, read-only) -->
    <div v-if="dataOpponent" class="flex flex-col items-center h-1/2">
      <template v-for="p in pieces" :key="p">
        <DraggablePiece
          :piece="p"
          :color="colorOpponent"
          :count="dataOpponent[p]"
          :size="verticalPieceSize"
        />
      </template>
    </div>
    <!-- Player's captured pieces (bottom, interactive) -->
    <div class="flex flex-col-reverse items-center" :class="dataOpponent ? 'h-1/2' : 'h-full'">
      <template v-for="p in pieces" :key="p">
        <DraggablePiece
          :piece="p"
          :color="props.color"
          :count="data[p]"
          :size="verticalPieceSize"
          :interactive="interactive"
          @piece-mousedown="emit('pieceMousedown', p, props.color, $event)"
        />
      </template>
    </div>
  </div>
</template>
