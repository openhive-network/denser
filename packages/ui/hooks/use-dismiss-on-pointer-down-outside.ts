import { useCallback, useEffect, useRef, type PointerEvent } from 'react';

/**
 * Calls `onDismiss` for every pointerdown outside a popup while `open` is true. Spread the returned
 * `onPointerDownCapture` on the popup's trigger and content: a press inside either of them, or inside
 * anything they render through a portal (React events follow the component tree), is not outside.
 *
 * Radix's DismissableLayer arms its own outside-press listener in a `setTimeout` after opening, and
 * a busy main thread runs queued input before that timer, so a press right after opening is lost and
 * the popup stays open. This listener is armed as soon as the open state commits.
 */
export function useDismissOnPointerDownOutside(open: boolean, onDismiss: () => void) {
  const insidePressRef = useRef<Event | null>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: Event) => {
      if (event !== insidePressRef.current) onDismissRef.current();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const onPointerDownCapture = useCallback((event: PointerEvent) => {
    insidePressRef.current = event.nativeEvent;
  }, []);

  return { onPointerDownCapture };
}
