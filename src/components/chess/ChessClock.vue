<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface ChessClockProps {
  remainingMs: number;
  active?: boolean;
  class?: string;
}

const props = defineProps<ChessClockProps>();

const isLow = computed(() => props.remainingMs < 10_000);

const display = computed(() => {
  const ms = Math.max(0, props.remainingMs);
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return isLow.value ? `${mm}:${ss}.${tenths}` : `${mm}:${ss}`;
});
</script>

<template>
  <div
    :class="
      cn(
        'font-mono font-semibold tabular-nums px-3 py-1 rounded-md border transition-colors',
        props.active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-muted text-muted-foreground border-border',
        isLow && 'text-destructive border-destructive',
        props.class,
      )
    "
  >
    {{ display }}
  </div>
</template>
