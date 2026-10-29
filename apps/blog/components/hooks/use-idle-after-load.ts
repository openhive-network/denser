'use client';

import { useEffect, useState } from 'react';

const IDLE_TIMEOUT_MS = 3_000;

/**
 * Becomes `true` once the page's `load` event has fired, `delayMs` more have
 * passed, and the browser is idle (or `IDLE_TIMEOUT_MS` has passed without an
 * idle period). Use it to keep non-critical work out of the initial page load.
 */
export function useIdleAfterLoad(delayMs = 0): boolean {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let delayHandle: ReturnType<typeof setTimeout> | undefined;
    const markIdle = () => setIsIdle(true);

    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(markIdle, { timeout: IDLE_TIMEOUT_MS });
      } else {
        timeoutHandle = setTimeout(markIdle, IDLE_TIMEOUT_MS);
      }
    };

    const afterLoad = () => {
      if (delayMs > 0) {
        delayHandle = setTimeout(scheduleIdle, delayMs);
      } else {
        scheduleIdle();
      }
    };

    if (document.readyState === 'complete') {
      afterLoad();
    } else {
      window.addEventListener('load', afterLoad, { once: true });
    }

    return () => {
      window.removeEventListener('load', afterLoad);
      if (delayHandle !== undefined) clearTimeout(delayHandle);
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, [delayMs]);

  return isIdle;
}
