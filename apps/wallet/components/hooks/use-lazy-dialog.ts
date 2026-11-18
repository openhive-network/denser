import { MouseEvent, useCallback, useRef, useState } from 'react';

/**
 * A dialog opened by buttons outside it (no Radix trigger): it mounts on the first open, so its
 * code and data load only then, and closing it gives the focus back to the button that opened it.
 */
export const useLazyDialog = () => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const openFrom = useCallback((event: MouseEvent<HTMLElement>) => {
    openerRef.current = event.currentTarget;
    setMounted(true);
    setOpen(true);
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    if (!openerRef.current) return;
    event.preventDefault();
    openerRef.current.focus();
  }, []);

  return { open, mounted, openFrom, onOpenChange: setOpen, onCloseAutoFocus };
};
