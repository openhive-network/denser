import { KeyboardEvent, useCallback, useRef, useState } from "react";

/**
 * Roving tabindex for a WAI-ARIA toolbar: exactly one item (the last one
 * focused, initially the first) is in the Tab order, and ArrowLeft/ArrowRight
 * (wrapping), Home and End move focus between items.
 *
 * `itemNames` is the ordered list of currently rendered item names.
 */
export function useRovingFocus(itemNames: string[]) {
  const [activeName, setActiveName] = useState<string | null>(null);
  const itemsRef = useRef(new Map<string, HTMLElement>());

  const currentName =
    activeName !== null && itemNames.includes(activeName)
      ? activeName
      : itemNames[0];

  const registerItem = useCallback(
    (name: string, element: HTMLElement | null) => {
      if (element) itemsRef.current.set(name, element);
      else itemsRef.current.delete(name);
    },
    []
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const count = itemNames.length;
      if (count === 0) return;
      const index = Math.max(itemNames.indexOf(currentName), 0);
      let nextIndex: number;
      switch (event.key) {
        case "ArrowRight":
          nextIndex = (index + 1) % count;
          break;
        case "ArrowLeft":
          nextIndex = (index - 1 + count) % count;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = count - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const nextName = itemNames[nextIndex];
      setActiveName(nextName);
      itemsRef.current.get(nextName)?.focus();
    },
    [itemNames, currentName]
  );

  const getTabIndex = (name: string) => (name === currentName ? 0 : -1);

  return { getTabIndex, setActiveName, registerItem, onKeyDown };
}
