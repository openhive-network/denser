'use client';

import { useCallback, useEffect, useState } from 'react';

const TICK_MS = 1_000;

/**
 * A wait of a few seconds: `start(seconds)` begins it, `clear()` ends it early. `secondsLeft` is
 * the whole seconds still to wait, or null when no wait is running (it ends by itself at zero).
 */
export function useRetryCountdown() {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) setUntil(null);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [until]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setUntil(current + seconds * 1000);
  }, []);
  const clear = useCallback(() => setUntil(null), []);

  const secondsLeft = until === null ? null : Math.max(0, Math.ceil((until - now) / 1000));
  return { secondsLeft, start, clear };
}
