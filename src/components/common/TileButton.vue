<template>
  <div
    :class="
      cn(
        'flex flex-col items-center justify-center gap-1',
        'w-full aspect-square p-4',
        'bg-card/50 backdrop-blur-sm',
        'text-card-foreground',
        'border border-border/50',
        'rounded-xl shadow-sm',
        'transition-all duration-200 ease-in-out',
        props.disabled
          ? 'opacity-40 cursor-not-allowed pointer-events-none'
          : [
              'cursor-pointer',
              'hover:bg-accent/60 hover:text-accent-foreground',
              'hover:border-border hover:shadow-md',
              'active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            ],
        props.class,
      )
    "
  >
    <span class="text-2xl font-bold">{{ title }}</span>
    <span class="text-sm">{{ subtitle }}</span>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'vue';

const props = defineProps<{
  class?: HTMLAttributes['class'];
  title: string;
  subtitle?: string;
  disabled?: boolean;
}>();
</script>
