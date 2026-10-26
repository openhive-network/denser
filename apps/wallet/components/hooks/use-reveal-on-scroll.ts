import { useEffect, useState } from 'react';

/** How close to the end of the document, in viewport heights, scrolling reveals more. */
const REVEAL_DISTANCE = 1.2;

/**
 * How many of a list's items to render: `step` at first and `step` more each time the document is
 * scrolled near its end, until all `total`. Starts over at `step` whenever `resetKey` changes.
 */
export const useRevealOnScroll = (total: number, step: number, resetKey: string): number => {
  const [revealed, setRevealed] = useState({ key: resetKey, count: step });
  const count = revealed.key === resetKey ? revealed.count : step;
  if (revealed.key !== resetKey) setRevealed({ key: resetKey, count: step });

  useEffect(() => {
    if (count >= total) return;
    const handleScroll = () => {
      const scroller = document.scrollingElement;
      if (!scroller) return;
      const { scrollHeight, scrollTop, clientHeight } = scroller;
      if (scrollHeight - scrollTop > clientHeight * REVEAL_DISTANCE) return;
      setRevealed((current) =>
        current.key === resetKey ? { key: resetKey, count: current.count + step } : current
      );
    };
    document.addEventListener('scroll', handleScroll);
    return () => document.removeEventListener('scroll', handleScroll);
  }, [count, total, step, resetKey]);

  return Math.min(count, total);
};
