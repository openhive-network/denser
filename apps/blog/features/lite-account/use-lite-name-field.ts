'use client';

import { useCallback, useEffect, useState } from 'react';
import { generateLiteName } from '@hiveio/lite-account';
import { checkLiteNameAvailability, type LiteNameState } from './lite-name-availability';
import { createLiteNameChecker } from './lite-name-checker';

/**
 * The name dialog's field: starts on `takenName` (shown as taken) or on a suggestion the gateway
 * says is available, and checks every edit as the user types. `state` is always about `name`.
 */
export function useLiteNameField(takenName?: string) {
  const [name, setName] = useState(() => takenName ?? generateLiteName());
  const [status, setStatus] = useState<{ name: string; state: LiteNameState }>({ name, state: 'checking' });
  const [checker] = useState(() =>
    createLiteNameChecker(checkLiteNameAvailability, (checked, state) => setStatus({ name: checked, state }))
  );

  const suggest = useCallback(
    async (first?: string) => {
      const suggestion = await checker.suggest(first);
      if (suggestion) setName(suggestion);
    },
    [checker]
  );

  const edit = useCallback(
    (value: string) => {
      setName(value);
      checker.update(value);
    },
    [checker]
  );

  // Runs on mount only: the starting name is this effect's own state.
  useEffect(() => {
    if (takenName) {
      checker.remember(takenName, 'taken');
      checker.update(takenName);
    } else {
      void suggest(name);
    }
    return () => checker.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checker]);

  return { name, state: status.name === name ? status.state : 'checking', edit, suggest };
}
