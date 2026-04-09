<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import type { ChatMessage } from './types';
import ChatMessageItem from './ChatMessage.vue';

const props = defineProps<{
  messages: ChatMessage[];
  emptyMsg?: string;
}>();

const containerRef = ref<HTMLDivElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTo({
        top: containerRef.value.scrollHeight,
        behavior: 'smooth',
      });
    }
  });
}

watch(() => props.messages.length, scrollToBottom);

onMounted(scrollToBottom);
</script>

<template>
  <div
    ref="containerRef"
    class="flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-auto p-3 min-h-0 scroll-smooth"
  >
    <template v-if="props.messages.length > 0">
      <ChatMessageItem v-for="(message, index) in props.messages" :key="index" v-bind="message" />
    </template>
    <div v-else class="flex flex-1 items-center justify-center">
      <p class="text-xs text-muted-foreground select-none">{{ props.emptyMsg ?? 'No messages' }}</p>
    </div>
  </div>
</template>
