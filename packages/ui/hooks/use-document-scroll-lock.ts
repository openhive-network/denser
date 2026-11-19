import { useEffect } from 'react';

/**
 * Keeps the page from scrolling while `locked` is true, as a modal over it needs: a wheel or swipe
 * over the modal's backdrop, or one its own scroller chains on, would scroll the page underneath.
 * Where the page has a scrollbar, its gutter stays, so the page does not shift sideways.
 */
export function useDocumentScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const { overflow, scrollbarGutter } = root.style;
    const hasScrollbar = window.innerWidth > root.clientWidth;
    root.style.overflow = 'hidden';
    if (hasScrollbar) root.style.scrollbarGutter = 'stable';
    return () => {
      root.style.overflow = overflow;
      root.style.scrollbarGutter = scrollbarGutter;
    };
  }, [locked]);
}
