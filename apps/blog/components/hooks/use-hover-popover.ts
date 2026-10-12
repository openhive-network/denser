'use client';

import { MouseEvent, PointerEvent, useRef, useState } from 'react';

const HOVER_CLOSE_DELAY_MS = 100;

/**
 * State for a Radix Popover that also opens while the mouse hovers its trigger or content.
 *
 * Click, Enter and Space toggle it as a regular popover: focus moves inside and returns to the
 * trigger on Esc. A hover-opened popover leaves focus where it is, and clicking its trigger keeps
 * it open instead of toggling it closed. Touch pointers are ignored so a tap toggles once.
 */
export function useHoverPopover() {
  const [open, setOpenState] = useState(false);
  const openRef = useRef(false);
  const isHovering = useRef(false);
  const openedByHover = useRef(false);

  const setOpen = (next: boolean) => {
    openRef.current = next;
    setOpenState(next);
  };

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    isHovering.current = true;
    if (!openRef.current) openedByHover.current = true;
    setOpen(true);
  };

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    isHovering.current = false;
    setTimeout(() => {
      if (!isHovering.current) setOpen(false);
    }, HOVER_CLOSE_DELAY_MS);
  };

  const onTriggerClick = (event: MouseEvent) => {
    // preventDefault skips Radix's own toggle, which would close the hover-opened popover
    if (openRef.current && openedByHover.current) event.preventDefault();
  };

  const onOpenChange = (next: boolean) => {
    if (next) openedByHover.current = false;
    setOpen(next);
  };

  const keepFocusWhenHovered = (event: Event) => {
    if (openedByHover.current) event.preventDefault();
  };

  return {
    rootProps: { open, onOpenChange },
    triggerProps: { onPointerEnter, onPointerLeave, onClick: onTriggerClick },
    contentProps: {
      onPointerEnter,
      onPointerLeave,
      onOpenAutoFocus: keepFocusWhenHovered,
      onCloseAutoFocus: keepFocusWhenHovered
    }
  };
}
