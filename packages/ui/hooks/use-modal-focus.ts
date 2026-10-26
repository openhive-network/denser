import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])'
]
  .map((selector) => `${selector}:not([data-focus-guard])`)
  .join(',');

function focusablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.closest('[inert]') && element.getClientRects().length > 0
  );
}

function focusWithoutScroll(element: HTMLElement | undefined) {
  element?.focus({ preventScroll: true });
}

/**
 * Keeps keyboard focus in a modal that stays mounted while closed. On opening, focus moves to the
 * element marked `data-autofocus` in `containerRef`, else its first focusable element, else the
 * container (give it `tabIndex={-1}`); Escape anywhere in the page calls `onClose`; on closing,
 * focus returns to the element that had it before opening, unless it has moved out of the modal.
 *
 * Tab and Shift+Tab wrap through the returned guards, rendered as the first and last children of
 * the container: a keydown handler cannot see Tab pressed inside a cross-origin iframe, but leaving
 * the iframe still lands on a guard.
 */
export function useModalFocus(open: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusWithoutScroll(
      container.querySelector<HTMLElement>('[data-autofocus]') ?? focusablesIn(container)[0] ?? container
    );

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      // An inert container has already dropped focus to the body
      const active = document.activeElement;
      const focusLeftBehind = !active || active === document.body || container.contains(active);
      if (focusLeftBehind && opener?.isConnected) focusWithoutScroll(opener);
    };
  }, [open]);

  const wrapTo = (end: 'first' | 'last') => () => {
    const container = containerRef.current;
    if (!container) return;
    const focusables = focusablesIn(container);
    const target = end === 'first' ? focusables[0] : focusables.at(-1);
    focusWithoutScroll(target ?? container);
  };
  const guardProps = (end: 'first' | 'last') => ({
    tabIndex: open ? 0 : -1,
    'aria-hidden': true,
    'data-focus-guard': '',
    onFocus: wrapTo(end)
  });

  return {
    containerRef,
    startGuardProps: guardProps('last'),
    endGuardProps: guardProps('first')
  };
}
