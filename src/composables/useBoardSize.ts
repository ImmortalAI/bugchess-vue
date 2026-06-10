import { useLocalStorage, useWindowSize } from '@vueuse/core';
import { computed } from 'vue';

const MIN_SIZE = 320;
const STORAGE_KEY = 'bugchess:board-size';

/** Snap to a multiple of 8 so every square is an integer px. */
const snap = (v: number) => Math.round(v / 8) * 8;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Main board size (px) for the desktop layout, persisted to localStorage.
 * The getter clamps against the current viewport, so a persisted value
 * larger than the screen is constrained without being written back.
 */
export function useBoardSize() {
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  // 0 = "not set yet" → fall back to 75% of viewport height.
  const stored = useLocalStorage(STORAGE_KEY, 0);

  const maxSize = computed(() => Math.min(windowHeight.value * 0.85, windowWidth.value * 0.5));

  // Raw, unsnapped size: small drag deltas must accumulate here — snapping
  // before accumulation would discard any delta smaller than the snap step.
  const rawSize = computed<number>({
    get: () => clamp(stored.value || windowHeight.value * 0.75, MIN_SIZE, maxSize.value),
    set: (v) => (stored.value = clamp(v, MIN_SIZE, maxSize.value)),
  });

  const boardSize = computed(() => snap(rawSize.value));

  const resizeBy = (deltaPx: number) => {
    rawSize.value = rawSize.value + deltaPx;
  };

  return { boardSize, resizeBy, minSize: MIN_SIZE, maxSize };
}
