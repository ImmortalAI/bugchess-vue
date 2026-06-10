<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import { ChessError } from '@/utils/chessError';
import ChessPromotion from '@/components/chess/ChessPromotion.vue';
import { cn } from '@/lib/utils';
import type { Config } from '@lichess-org/chessground/config';
import type { Color, File } from '@lichess-org/chessground/types';
import { Chessground } from '@lichess-org/chessground';
import type { Role } from 'chessops/types';

interface ChessBoardProps {
  /** Board edge length in px. */
  size: number;
  class?: string;
  config?: Config;
  isPromoting?: boolean;
  promotionColor?: Color;
  promotionFile?: File;
}

const props = defineProps<ChessBoardProps>();
const emit = defineEmits<{
  ready: [api: ReturnType<typeof Chessground>];
  'promotion-select': [role: Exclude<Role, 'king' | 'pawn'>];
}>();

const board = shallowRef<HTMLElement | null>(null);
const api = shallowRef<ReturnType<typeof Chessground> | null>(null);

onMounted(() => {
  if (board.value === null) {
    throw new ChessError('Board element not found');
  }

  api.value = Chessground(board.value, props.config);
  emit('ready', api.value);
});

// Chessground caches the bounds measured at init — re-measure after the new size hits the DOM.
watch(
  () => props.size,
  () => api.value?.redrawAll(),
  { flush: 'post' },
);

onBeforeUnmount(() => {
  if (api.value === null) return;
  api.value.destroy();
});
</script>

<template>
  <div :class="cn('relative', props.class)" :style="{ width: `${size}px`, height: `${size}px` }">
    <div ref="board" class="relative size-full"></div>
    <ChessPromotion
      v-if="isPromoting"
      :color="promotionColor ?? 'white'"
      :file="promotionFile ?? 'a'"
      @select="emit('promotion-select', $event)"
    />
  </div>
</template>
