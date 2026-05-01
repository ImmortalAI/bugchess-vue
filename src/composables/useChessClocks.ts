import { useDocumentVisibility, useRafFn } from '@vueuse/core';
import { reactive, watch } from 'vue';

/** All four clock slots: two boards, two colors. */
const CLOCK_IDS = ['mainWhite', 'mainBlack', 'mateWhite', 'mateBlack'] as const;

export type ClockId = (typeof CLOCK_IDS)[number];

interface ClockState {
  /** Milliseconds remaining on this clock. */
  remainingMs: number;
  /** Whether this clock is currently counting down. */
  active: boolean;
}

type Clocks = Record<ClockId, ClockState>;

/**
 * Manages all four Bughouse chess clocks with a single shared RAF loop.
 * At most two clocks tick simultaneously (one per board).
 * Automatically accounts for time elapsed while the browser tab was hidden.
 */
export function useChessClocks() {
  /** Reactive map of all four clocks. */
  const clocks = reactive<Clocks>({
    mainWhite: { remainingMs: 0, active: false },
    mainBlack: { remainingMs: 0, active: false },
    mateWhite: { remainingMs: 0, active: false },
    mateBlack: { remainingMs: 0, active: false },
  });

  /**
   * Single shared RAF loop that ticks all active clocks.
   * Pauses itself automatically when no clock is running.
   * `delta` is provided by useRafFn — milliseconds since the last frame.
   */
  const { pause: pauseLoop, resume: resumeLoop } = useRafFn(
    ({ delta }) => {
      let anyActive = false;
      for (const id of CLOCK_IDS) {
        const clock = clocks[id];
        if (!clock.active) continue;

        anyActive = true;
        clock.remainingMs = Math.max(0, clock.remainingMs - delta);
        if (clock.remainingMs === 0) {
          clock.active = false;
        }
      }

      if (!anyActive) pauseLoop();
    },
    { immediate: false },
  );

  /**
   * Start counting down the given clock.
   * No-op if the clock has no time remaining.
   * @param id - Clock to start.
   */
  function start(id: ClockId) {
    if (clocks[id].remainingMs <= 0) return;
    clocks[id].active = true;
    resumeLoop();
  }

  /**
   * Stop counting down the given clock.
   * Pauses the RAF loop when no clocks remain active.
   * @param id - Clock to stop.
   */
  function stop(id: ClockId) {
    clocks[id].active = false;
    if (CLOCK_IDS.every((cid) => !clocks[cid].active)) {
      pauseLoop();
    }
  }

  /**
   * Stop and set a new time for the given clock without starting it.
   * @param id - Clock to reset.
   * @param ms - New time in milliseconds.
   */
  function reset(id: ClockId, ms: number) {
    clocks[id].active = false;
    clocks[id].remainingMs = ms;
  }

  /**
   * Stop all clocks and set the same time for all of them.
   * @param ms - New time in milliseconds.
   */
  function resetAll(ms: number) {
    pauseLoop();
    for (const id of CLOCK_IDS) {
      clocks[id].active = false;
      clocks[id].remainingMs = ms;
    }
  }

  // When the tab is hidden, RAF stops automatically (browser behavior).
  // On return we calculate the real elapsed wall-clock time and subtract it
  // from every clock that was running — the game clock never pauses.
  const visibility = useDocumentVisibility();
  /** Timestamp recorded when the tab was hidden; null when the tab is visible. */
  let hiddenAt: number | null = null;

  watch(visibility, (v) => {
    if (v === 'hidden') {
      hiddenAt = performance.now();
      pauseLoop();
    } else if (hiddenAt !== null) {
      const elapsed = performance.now() - hiddenAt;
      hiddenAt = null;

      let anyStillActive = false;
      for (const id of CLOCK_IDS) {
        if (!clocks[id].active) continue;
        clocks[id].remainingMs = Math.max(0, clocks[id].remainingMs - elapsed);
        if (clocks[id].remainingMs === 0) {
          clocks[id].active = false;
        } else {
          anyStillActive = true;
        }
      }

      if (anyStillActive) {
        resumeLoop();
      }
    }
  });

  function sync(id: ClockId, ms: number) {
    clocks[id].remainingMs = ms;
  }

  function toggle(board: 'main' | 'mate') {
    const w: ClockId = board === 'main' ? 'mainWhite' : 'mateWhite';
    const b: ClockId = board === 'main' ? 'mainBlack' : 'mateBlack';
    if (clocks[w].active) {
      stop(w);
      start(b);
    } else if (clocks[b].active) {
      stop(b);
      start(w);
    }
  }

  /** Stop all clocks and zero their remaining time. */
  function clear() {
    pauseLoop();
    for (const id of CLOCK_IDS) {
      clocks[id].active = false;
      clocks[id].remainingMs = 0;
    }
  }

  return { clocks, start, stop, reset, resetAll, sync, toggle, clear };
}
