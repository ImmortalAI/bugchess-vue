<script setup lang="ts">
import type { PocketData } from '@/api/chess/chess.model';
import type { Color } from '@lichess-org/chessground/types';

interface Props {
  piece: keyof PocketData;
  color: Color;
  count: number;
  interactive?: boolean;
  class?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  pieceMousedown: [event: MouseEvent | TouchEvent];
}>();

const onInteraction = (e: MouseEvent | TouchEvent) => {
  e.preventDefault();
  emit('pieceMousedown', e);
};
</script>

<template>
  <div
    :class="[
      'relative @container',
      props.class ?? 'h-1/5 aspect-square',
      interactive && 'cursor-grab hover:ring-1 hover:ring-white/40 rounded-sm',
    ]"
  >
    <span
      :class="[piece, color, 'block w-full h-full bg-cover bg-no-repeat']"
      @mousedown="interactive && onInteraction($event)"
      @touchstart="interactive && onInteraction($event)"
    />
    <span
      v-if="count > 1"
      class="absolute bottom-0 right-0 w-[35%] h-[35%] rounded-full bg-primary text-primary-foreground font-bold leading-none flex items-center justify-center pointer-events-none text-[9px] @[50px]:text-[12px] @[70px]:text-[15px]"
      >{{ count }}</span
    >
  </div>
</template>
