<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import type { ChatMessage } from '../ChatComponent/types';
import MobileChatNotification from './MobileChatNotification.vue';
import MobileChatQuickBar from './MobileChatQuickBar.vue';

const NOTIFICATION_DURATION_MS = 4000;

const props = defineProps<{
  messages: ChatMessage[];
  quickMessages?: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  send: [message: string];
}>();

const notifSender = ref('');
const notifText = ref('');
const notifVisible = ref(false);
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    if (newLen <= oldLen) return;
    const msg = props.messages[newLen - 1] as ChatMessage | undefined;
    if (!msg || msg.isOwn) return;

    notifSender.value = msg.sender;
    notifText.value = msg.text;
    notifVisible.value = true;

    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
      notifVisible.value = false;
    }, NOTIFICATION_DURATION_MS);
  },
);

onBeforeUnmount(() => {
  if (dismissTimer) clearTimeout(dismissTimer);
});

const handleSelect = (msg: string) => {
  if (props.disabled) return;
  emit('send', msg);
};
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <Transition name="notif">
      <MobileChatNotification v-if="notifVisible" :sender="notifSender" :text="notifText" />
    </Transition>
    <MobileChatQuickBar
      v-if="props.quickMessages?.length"
      :messages="props.quickMessages"
      :disabled="props.disabled"
      @select="handleSelect"
    />
  </div>
</template>

<style scoped>
.notif-enter-active,
.notif-leave-active {
  transition:
    opacity 0.2s ease,
    max-height 0.25s ease,
    margin-bottom 0.25s ease;
  max-height: 120px;
  overflow: hidden;
}
.notif-enter-from,
.notif-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
