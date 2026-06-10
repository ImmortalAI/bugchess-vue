<script setup lang="ts">
import { onBeforeUnmount } from 'vue';

const emit = defineEmits<{ resize: [deltaPx: number] }>();

let isDragging = false;
let prevY = 0;
let pendingDelta = 0;
let rafId: number | null = null;

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging) return;
  pendingDelta += e.clientY - prevY;
  prevY = e.clientY;

  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    emit('resize', pendingDelta);
    pendingDelta = 0;
    rafId = null;
  });
};

const stopDrag = () => {
  isDragging = false;
  pendingDelta = 0;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', stopDrag);
};

const startDrag = (e: MouseEvent) => {
  e.preventDefault();
  prevY = e.clientY;
  isDragging = true;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', stopDrag);
};

onBeforeUnmount(stopDrag);
</script>

<template>
  <div
    class="absolute right-0 bottom-0 size-6 rounded-full cursor-ns-resize select-none flex items-center justify-center text-muted-foreground/40 transition-colors hover:bg-foreground hover:text-background"
    @mousedown="startDrag"
  >
    <span class="block rotate-45 text-sm leading-none">»</span>
  </div>
</template>
