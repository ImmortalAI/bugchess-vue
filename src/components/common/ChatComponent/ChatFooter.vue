<script setup lang="ts">
import Button from '@/components/ui/button/Button.vue';
import Input from '@/components/ui/input/Input.vue';
import { SendHorizontal } from '@lucide/vue';
import { ref } from 'vue';
import ChatQuickMessages from './ChatQuickMessages.vue';

const props = defineProps<{
  disabled?: boolean;
  quickMsgs?: string[];
  placeholder?: string;
}>();

const emits = defineEmits<{
  send: [message: string];
}>();

const inputText = ref('');

const send = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || props.disabled) return;
  emits('send', trimmed);
};

const handleSubmit = () => {
  send(inputText.value);
  inputText.value = '';
};

const handleQuickSubmit = (msg: string) => {
  send(msg);
};

const keyDownHandler = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};
</script>

<template>
  <div class="flex items-center gap-1.5 p-2 border-t bg-background">
    <ChatQuickMessages v-if="props.quickMsgs && props.quickMsgs.length > 0" :messages="props.quickMsgs"
      :disabled="props.disabled" @select="handleQuickSubmit" />
    <Input v-model="inputText" :placeholder="props.placeholder ?? 'Type a message...'" :disabled="props.disabled"
      @keydown="keyDownHandler" class="flex-1 h-9" />
    <Button size="icon" :disabled="props.disabled || !inputText.trim()" @click="handleSubmit" class="shrink-0 size-9"
      aria-label="Send message">
      <SendHorizontal :size="4" />
    </Button>
  </div>
</template>
