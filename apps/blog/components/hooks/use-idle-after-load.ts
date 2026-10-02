'use client';

import { useEffect, useState } from 'react';

const IDLE_TIMEOUT_MS = 3_000;

/**
 * Becomes `true` once the page's `load` event has fired and the browser is
 * idle (or `IDLE_TIMEOUT_MS` has passed without an idle period). Use it to
 * keep non-critical work out of the initial page load.
 */
export function useIdleAfterLoad(): boolean {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const markIdle = () => setIsIdle(true);

    const scheduleIdle = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(markIdle, { timeout: IDLE_TIMEOUT_MS });
      } else {
        timeoutHandle = setTimeout(markIdle, IDLE_TIMEOUT_MS);
      }
    };

    if (document.readyState === 'complete') {
      scheduleIdle();
    } else {
      window.addEventListener('load', scheduleIdle, { once: true });
    }

    return () => {
      window.removeEventListener('load', scheduleIdle);
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, []);

  return isIdle;
}
