import { useState } from 'react';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

// Allow hook to set specific type the same API as useState
function useLocalStorage<T extends string | object>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T | undefined>(() => {
    if (typeof window === 'undefined' && 'localStorage' in global && global.localStorage) {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T) => {
    logger.info('in useLocalStorage setValue, value is %o', value);
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== 'undefined' && 'localStorage' in global && global.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
    }
  };
  return [storedValue, setValue] as const;
}

export { useLocalStorage };
