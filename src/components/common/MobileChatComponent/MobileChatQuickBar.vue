<script setup lang="ts">
defineProps<{
  messages: string[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [message: string];
}>();
</script>

<template>
  <div class="quick-bar flex gap-2 overflow-x-auto px-1 py-0.5">
    <button
      v-for="(msg, i) in messages"
      :key="i"
      :disabled="disabled"
      class="shrink-0 px-3 py-1.5 text-sm rounded-full border border-border bg-background text-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
      @click="emit('select', msg)"
    >
      {{ msg }}
    </button>
  </div>
</template>

<style scoped>
.quick-bar {
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.quick-bar::-webkit-scrollbar {
  display: none;
}
</style>
