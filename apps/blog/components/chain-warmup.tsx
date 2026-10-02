'use client';

import { useEffect } from 'react';
import { getChain } from '@transaction/lib/chain';
import { getLogger } from '@hive/ui/lib/logging';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useIdleAfterLoad } from './hooks/use-idle-after-load';

const logger = getLogger('app');

/**
 * For a logged-in user, creates the wax chain once the page is idle after load, so its
 * wasm download and compile stay out of the initial load but the first vote, comment or
 * transfer does not pay for it. Anonymous readers only read, which needs no wasm, so
 * they never download it.
 */
export default function ChainWarmup() {
  const isIdle = useIdleAfterLoad();
  const { user } = useUserClient();
  const isLoggedIn = !!user?.isLoggedIn;

  useEffect(() => {
    if (!isIdle || !isLoggedIn) return;
    getChain().catch((error) => logger.error(error, 'Failed to warm up the wax chain'));
  }, [isIdle, isLoggedIn]);

  return null;
}
