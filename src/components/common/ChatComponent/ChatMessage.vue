<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  sender: string;
  text: string;
  isOwn: boolean;
}>();
</script>

<template>
  <div
    :class="
      cn(
        'flex flex-col max-w-[80%] animate-in fade-in slide-in-from-bottom-1 duration-150',
        isOwn ? 'items-end self-end' : 'items-start self-start',
      )
    "
  >
    <span class="text-[11px] text-muted-foreground mb-0.5 px-2 select-none">{{
      props.sender
    }}</span>
    <div
      :class="
        cn(
          'rounded-2xl px-3 py-1.5 text-sm wrap-break-word leading-snug',
          isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm',
        )
      "
    >
      {{ props.text }}
    </div>
  </div>
</template>
