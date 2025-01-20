import { useRef } from 'react';

/**
 * hook for using debounce
 *
 * @param func function to be called after wait
 * @param wait wait in ms
 * @returns debounce function to be called on change
 */
export const useDebounce = <T extends (...args: any) => any>(func: T, wait: number) => {
  const timeoutID = useRef(setTimeout(() => null, 0));

  const debounced = (...args: any) => {
    clearTimeout(timeoutID.current);
    timeoutID.current = setTimeout(() => func(...args), wait);
  };

  return debounced;
};
