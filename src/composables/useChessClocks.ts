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
  /** Optional secondary time (ms) that replaces `remainingMs` on the next `toggle` — used to stage the real game clock behind a temporary countdown (e.g. auto-abort). Cleared after the swap. */
  tempMs?: number;
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
   * Stop all four clocks without zeroing their remaining time.
   * Pauses the RAF loop immediately.
   */
  function stopAll() {
    pauseLoop();
    for (const id of CLOCK_IDS) {
      clocks[id].active = false;
    }
  }

  /**
   * Stop and set a new time for the given clock without starting it.
   * @param id - Clock to reset.
   * @param ms - New time in milliseconds.
   */
  function reset(id: ClockId, ms: number, tempMs?: number) {
    clocks[id].active = false;
    clocks[id].remainingMs = ms;
    if (tempMs) clocks[id].tempMs = tempMs;
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

  /**
   * Overwrite the remaining time for a clock without changing its running state.
   * Used to apply authoritative server values after a move.
   * @param id - Clock to update.
   * @param ms - New remaining time in milliseconds.
   */
  function sync(id: ClockId, ms: number) {
    clocks[id].remainingMs = ms;
  }

  /**
   * Switch the running clock on a board from the current mover to the next mover.
   * If the stopping clock has a `tempMs` staged, its `remainingMs` is replaced by that value
   * before it is handed off (swaps a temporary countdown back to the real game clock).
   * No-op if neither clock on the board is currently active.
   * @param board - Which board's clock pair to toggle.
   */
  function toggle(board: 'main' | 'mate') {
    const w: ClockId = board === 'main' ? 'mainWhite' : 'mateWhite';
    const b: ClockId = board === 'main' ? 'mainBlack' : 'mateBlack';
    if (clocks[w].active) {
      stop(w);
      if (clocks[w].tempMs) {
        clocks[w].remainingMs = clocks[w].tempMs;
        clocks[w].tempMs = undefined;
      }
      start(b);
    } else if (clocks[b].active) {
      stop(b);
      if (clocks[b].tempMs) {
        clocks[b].remainingMs = clocks[b].tempMs;
        clocks[b].tempMs = undefined;
      }
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

  return { clocks, start, stop, stopAll, reset, resetAll, sync, toggle, clear };
}
