<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import Button from '@/components/ui/button/Button.vue';
import type { ButtonVariants } from '@/components/ui/button';

const props = withDefaults(
  defineProps<{
    label?: string;
    confirmLabel: string;
    /** Milliseconds before the confirm state resets automatically. */
    timeout?: number;
    type?: 'icon';
    variant?: ButtonVariants['variant'];
  }>(),
  {
    timeout: 3000,
    variant: 'outline',
  },
);

const emit = defineEmits<{ confirm: [] }>();

const confirming = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

const clearTimer = () => {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
};

const onClick = () => {
  if (!confirming.value) {
    confirming.value = true;
    timer = setTimeout(() => {
      confirming.value = false;
      timer = null;
    }, props.timeout);
  } else {
    clearTimer();
    confirming.value = false;
    emit('confirm');
  }
};

onUnmounted(clearTimer);
</script>

<template>
  <Button
    :variant="confirming ? 'destructive' : variant"
    :size="type === 'icon' && !confirming ? 'icon' : 'default'"
    @click="onClick"
  >
    <template v-if="confirming">{{ confirmLabel }}</template>
    <template v-else-if="type === 'icon'"><slot /></template>
    <template v-else>{{ label }}</template>
  </Button>
</template>
