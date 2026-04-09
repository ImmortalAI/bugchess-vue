<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import type { ChatMessage } from './types';
import ChatHeader from './ChatHeader.vue';
import ChatMessages from './ChatMessages.vue';
import { cn } from '@/lib/utils';
import ChatFooter from './ChatFooter.vue';

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class'];
    title?: string;
    emptyPlaceholder?: string;
    inputPlaceholder?: string;
    messages: ChatMessage[];
    disabled?: boolean;
    quickMessages?: string[];
  }>(),
  {
    disabled: false,
  },
);

const emits = defineEmits<{
  send: [message: string];
}>();

const handleSend = (message: string) => {
  if (props.disabled) return;
  emits('send', message);
};
</script>

<template>
  <div :class="cn('flex flex-col border rounded-lg bg-background overflow-hidden', props.class)">
    <ChatHeader v-if="props.title" :title="props.title" />
    <ChatMessages :messages="props.messages" :empty-msg="props.emptyPlaceholder" />
    <ChatFooter
      :disabled="props.disabled"
      :quick-msgs="props.quickMessages"
      @send="handleSend"
      :placeholder="props.inputPlaceholder"
    />
  </div>
</template>
