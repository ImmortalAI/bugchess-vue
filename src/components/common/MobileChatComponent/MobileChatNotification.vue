<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  sender: string;
  text: string;
}>();

// Deterministic hue from sender name so each player has a consistent avatar color
const avatarStyle = computed(() => {
  let hash = 0;
  for (let i = 0; i < props.sender.length; i++) {
    hash = props.sender.charCodeAt(i) + ((hash << 5) - hash);
  }
  return { backgroundColor: `hsl(${Math.abs(hash) % 360}, 55%, 48%)` };
});

const initial = computed(() => props.sender.charAt(0).toUpperCase());
</script>

<template>
  <div
    class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-card/90 backdrop-blur-sm shadow-sm"
  >
    <div
      class="size-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold text-white"
      :style="avatarStyle"
    >
      {{ initial }}
    </div>
    <div class="flex flex-col min-w-0">
      <span class="text-xs text-muted-foreground leading-none mb-0.5 select-none">{{
        sender
      }}</span>
      <p class="text-sm leading-snug break-words line-clamp-2">{{ text }}</p>
    </div>
  </div>
</template>
