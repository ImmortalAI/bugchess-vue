<script setup lang="ts">
import { MessageCircle } from '@lucide/vue';

const props = defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="flex items-center gap-2 px-4 py-2.5 border-b border-muted/30 select-none">
    <MessageCircle class="size-4 text-muted-foreground shrink-0" />
    <h3 class="text-sm font-semibold truncate">{{ props.title }}</h3>
  </div>
</template>
