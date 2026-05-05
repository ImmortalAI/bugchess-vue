<script setup lang="ts">
import { cn } from '@/lib/utils';
import type { Color, File } from '@lichess-org/chessground/types';
import type { Role } from 'chessops/types';
import { computed } from 'vue';

const pieces: { name: Exclude<Role, 'king' | 'pawn'>; pos: number }[] = [
  { name: 'queen', pos: 0 },
  { name: 'knight', pos: 1 },
  { name: 'rook', pos: 2 },
  { name: 'bishop', pos: 3 },
];

interface ChessPromotionProps {
  class?: string;
  color: Color;
  file: File;
}

const props = defineProps<ChessPromotionProps>();
const emit = defineEmits<{ select: [role: Exclude<Role, 'king' | 'pawn'>] }>();

const fileToIndex: Record<File, number> = {
  a: 0,
  b: 1,
  c: 2,
  d: 3,
  e: 4,
  f: 5,
  g: 6,
  h: 7,
};

const leftPos = computed(() => {
  const index = fileToIndex[props.file];
  return index * 12.5;
});
</script>

<template>
  <div :class="cn(props.class, 'absolute top-0 left-0 bg-black/50 rounded-xl z-20 group w-full h-full')
    ">
    <span v-for="piece in pieces" :key="piece.pos"
      class="absolute w-[12.5%] h-[12.5%] pointer-events-auto bg-muted-foreground rounded-[50%] z-25 transition-all hover:bg-muted hover:rounded-none group-hover:scale-100"
      :style="{ top: `${piece.pos * 12.5}%`, left: `${leftPos}%` }" @click="emit('select', piece.name)">
      <span
        class="absolute top-0 left-0 w-full h-full bg-cover z-30 will-change-transform pointer-events-none scale-80 transition-transform"
        :class="[piece.name, props.color]"></span>
    </span>
  </div>
</template>
