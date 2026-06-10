<script setup lang="ts">
import type { PocketData } from '@/api/chess/chess.model';
import type { Color } from '@lichess-org/chessground/types';
import { computed } from 'vue';

interface Props {
  piece: keyof PocketData;
  color: Color;
  count: number;
  /** Edge length of the piece slot in px. */
  size: number;
  interactive?: boolean;
  class?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  pieceMousedown: [event: MouseEvent | TouchEvent];
}>();

const isActive = computed(() => props.interactive && props.count > 0);
const badgeFontSize = computed(() => Math.max(9, Math.round(props.size * 0.28)));

const onInteraction = (e: MouseEvent | TouchEvent) => {
  e.preventDefault();
  emit('pieceMousedown', e);
};
</script>

<template>
  <div
    :class="[
      'relative',
      props.class,
      isActive && 'cursor-grab hover:ring-1 hover:ring-white/40 rounded-sm',
      count === 0 && 'opacity-30',
    ]"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <span
      :class="[piece, color, 'block w-full h-full bg-cover bg-no-repeat']"
      @mousedown="isActive && onInteraction($event)"
      @touchstart="isActive && onInteraction($event)"
    />
    <span
      v-if="count > 1"
      class="absolute bottom-0 right-0 w-[35%] h-[35%] rounded-full bg-primary text-primary-foreground font-bold leading-none flex items-center justify-center pointer-events-none"
      :style="{ fontSize: `${badgeFontSize}px` }"
      >{{ count }}</span
    >
  </div>
</template>
