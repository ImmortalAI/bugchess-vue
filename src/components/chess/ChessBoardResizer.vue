<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';

const MIN_VH = 40;
const MAX_VH = 80;
const DEFAULT_VH = 75;

let isDragging = false;
let prevY = 0;
let currentVh = DEFAULT_VH;
let rafId: number | null = null;

const clamp = (val: number) => Math.min(MAX_VH, Math.max(MIN_VH, val));

const setBodyVars = (vh: number) => {
  const rounded = Math.round(vh * 2) / 2; // шаг 0.5vh
  document.body.style.setProperty('--cg-width', `${rounded}vh`);
  document.body.style.setProperty('--cg-height', `${rounded}vh`);
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging) return;
  const deltaVh = ((e.clientY - prevY) / window.innerHeight) * 100;
  prevY = e.clientY;
  currentVh = clamp(currentVh + deltaVh);

  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    setBodyVars(currentVh);
    rafId = null;
  });
};

const stopDrag = () => {
  isDragging = false;
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

onMounted(() => setBodyVars(DEFAULT_VH));
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
