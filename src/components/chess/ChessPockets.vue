<script setup lang="ts">
import type { PocketData } from '@/api/chess/chess.model';
import type { Color } from '@lichess-org/chessground/types';
import { cn } from '@/lib/utils';
import { computed } from 'vue';
import DraggablePiece from './DraggablePiece.vue';

interface PocketProps {
  class?: string;
  orientation?: 'vertical' | 'horizontal';
  color: Color;
  data: PocketData;
  dataOpponent?: PocketData;
  interactive?: boolean;
}

const pieces: (keyof PocketData)[] = ['pawn', 'knight', 'bishop', 'rook', 'queen'];

const props = defineProps<PocketProps>();

const emit = defineEmits<{
  pieceMousedown: [piece: keyof PocketData, color: Color, event: MouseEvent | TouchEvent];
}>();

const colorOpponent = computed<Color>(() => (props.color === 'white' ? 'black' : 'white'));
const isHorizontal = computed(() => props.orientation === 'horizontal');
</script>

<template>
  <!-- Horizontal layout: single strip of pieces in a row -->
  <div
    v-if="isHorizontal"
    :class="
      cn('flex flex-row h-14 rounded-md border border-border bg-pocket p-1 gap-1', props.class)
    "
  >
    <template v-for="p in pieces" :key="p">
      <DraggablePiece
        v-if="data[p] > 0"
        :piece="p"
        :color="props.color"
        :count="data[p]"
        :interactive="interactive"
        class="h-full aspect-square"
        @piece-mousedown="emit('pieceMousedown', p, props.color, $event)"
      />
    </template>
  </div>

  <!-- Vertical layout: opponent on top, player on bottom -->
  <div
    v-else
    :class="
      cn(
        'ml-1 h-full flex flex-col rounded-md border border-border bg-pocket p-1 gap-1',
        props.class,
      )
    "
  >
    <!-- Opponent's captured pieces (top, read-only) -->
    <div v-if="dataOpponent" class="flex flex-col h-1/2">
      <template v-for="p in pieces" :key="p">
        <DraggablePiece
          v-if="dataOpponent[p] > 0"
          :piece="p"
          :color="colorOpponent"
          :count="dataOpponent[p]"
        />
      </template>
    </div>
    <!-- Player's captured pieces (bottom, interactive) -->
    <div :class="dataOpponent ? 'flex flex-col-reverse h-1/2' : 'flex flex-col-reverse h-full'">
      <template v-for="p in pieces" :key="p">
        <DraggablePiece
          v-if="data[p] > 0"
          :piece="p"
          :color="props.color"
          :count="data[p]"
          :interactive="interactive"
          @piece-mousedown="emit('pieceMousedown', p, props.color, $event)"
        />
      </template>
    </div>
  </div>
</template>
