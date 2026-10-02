'use client';

import { useEffect, useRef } from 'react';

/** Delay before each automatic attempt; the last one repeats until the schedule stops. */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000];

/**
 * How long the schedule's position outlives an unmount. A route error boundary remounts its error
 * component a few milliseconds after each failed attempt, so the position must survive that gap;
 * an unmount not followed by a remount (the route recovered, or the user left) ends the schedule.
 */
const RESUME_GRACE_MS = 1_000;

let carriedAttempts = 0;
let dropCarriedAttempts: ReturnType<typeof setTimeout> | undefined;

const delayForAttempt = (attempt: number): number =>
  RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];

/**
 * Calls `retry` on a backoff schedule (2 s, 5 s, 10 s, then every 30 s) while the calling component
 * stays mounted. An attempt that comes due while the tab is hidden waits until the tab is visible.
 * A remount right after an unmount resumes the schedule rather than restarting it.
 */
export function useAutoRetry(retry: () => void): void {
  const retryRef = useRef(retry);
  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);

  useEffect(() => {
    clearTimeout(dropCarriedAttempts);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      timer = setTimeout(attemptWhenVisible, delayForAttempt(carriedAttempts));
    };
    const attemptNow = () => {
      carriedAttempts += 1;
      retryRef.current();
      schedule();
    };
    const onVisibilityChange = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      attemptNow();
    };
    function attemptWhenVisible() {
      if (document.hidden) {
        document.addEventListener('visibilitychange', onVisibilityChange);
      } else {
        attemptNow();
      }
    }

    schedule();
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      dropCarriedAttempts = setTimeout(() => {
        carriedAttempts = 0;
      }, RESUME_GRACE_MS);
    };
  }, []);
}
