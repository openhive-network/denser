'use client';

import { useEffect, useRef, useState } from 'react';

/** Delay before each automatic attempt; once all of them have been made, the schedule stops. */
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000, 30_000, 30_000];

/**
 * How long the schedule's position outlives an unmount. A route error boundary remounts its error
 * component a few milliseconds after each failed attempt, so the position must survive that gap;
 * an unmount not followed by a remount (the route recovered, or the user left) ends the schedule.
 */
const RESUME_GRACE_MS = 1_000;

let carriedAttempts = 0;
let dropCarriedAttempts: ReturnType<typeof setTimeout> | undefined;

const isExhausted = (): boolean => carriedAttempts >= RETRY_DELAYS_MS.length;

/**
 * Calls `retry` on a backoff schedule (2 s, 5 s, 10 s, then three times every 30 s) while the
 * calling component stays mounted, and then stops. An attempt that comes due while the tab is
 * hidden waits until the tab is visible. A remount right after an unmount resumes the schedule
 * rather than restarting it, so a component remounted after the last attempt does not retry.
 *
 * Returns `exhausted`: true once every automatic attempt has been made.
 */
export function useAutoRetry(retry: () => void): { exhausted: boolean } {
  const retryRef = useRef(retry);
  const [exhausted, setExhausted] = useState(isExhausted);
  useEffect(() => {
    retryRef.current = retry;
  }, [retry]);

  useEffect(() => {
    clearTimeout(dropCarriedAttempts);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      timer = setTimeout(attemptWhenVisible, RETRY_DELAYS_MS[carriedAttempts]);
    };
    const attemptNow = () => {
      carriedAttempts += 1;
      retryRef.current();
      if (isExhausted()) {
        setExhausted(true);
      } else {
        schedule();
      }
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

    if (!isExhausted()) schedule();
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      dropCarriedAttempts = setTimeout(() => {
        carriedAttempts = 0;
      }, RESUME_GRACE_MS);
    };
  }, []);

  return { exhausted };
}
