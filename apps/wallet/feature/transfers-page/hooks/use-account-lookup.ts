import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccount } from '@transaction/lib/hive-api';
import { checkAccountNameFormat } from '@ui/lib/account-name-rules';

const LOOKUP_DEBOUNCE_MS = 400;

export type AccountLookupStatus = 'empty' | 'checking' | 'found' | 'not_found' | 'error';

/**
 * Whether the account `name` exists on chain, looked up once typing has paused. A name that
 * breaks the account-name format is `not_found` without a request; until the lookup for the
 * current name answers, the status is `checking`.
 */
export const useAccountLookup = (name: string): AccountLookupStatus => {
  const [debouncedName, setDebouncedName] = useState(name);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedName(name), LOOKUP_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [name]);

  const isWellFormed = checkAccountNameFormat(debouncedName) === null;
  const { data: exists, isError } = useQuery({
    queryKey: ['account-exists', debouncedName],
    queryFn: async () => Boolean(await getAccount(debouncedName)),
    enabled: isWellFormed
  });

  if (!name) return 'empty';
  if (name !== debouncedName) return 'checking';
  if (!isWellFormed) return 'not_found';
  if (isError) return 'error';
  if (exists === undefined) return 'checking';
  return exists ? 'found' : 'not_found';
};
