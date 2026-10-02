'use client';

import { useEffect } from 'react';
import { getChain } from '@transaction/lib/chain';
import { getLogger } from '@hive/ui/lib/logging';
import { useIdleAfterLoad } from './hooks/use-idle-after-load';

const logger = getLogger('app');

/**
 * Creates the wax chain once the page is idle after load, so its wasm download
 * and compile stay out of the initial load but the first interaction that needs
 * the chain does not pay for it.
 */
export default function ChainWarmup() {
  const isIdle = useIdleAfterLoad();

  useEffect(() => {
    if (!isIdle) return;
    getChain().catch((error) => logger.error(error, 'Failed to warm up the wax chain'));
  }, [isIdle]);

  return null;
}
