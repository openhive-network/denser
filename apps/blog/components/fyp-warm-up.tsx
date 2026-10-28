'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { configuredFypApiUrl } from '@ui/config/public-vars';
import { getLogger } from '@ui/lib/logging';
import { useIdleAfterLoad } from '@/blog/components/hooks/use-idle-after-load';
import { FOR_YOU_SORT } from '@/blog/lib/utils';

const logger = getLogger('app');
const FOR_YOU_PATH = `/${FOR_YOU_SORT}`;

function logWarmUpFailure(error: unknown): void {
  logger.debug(error, 'For You warm-up failed');
}

/**
 * Warms the signed-in reader's For You feed once per browser session: after the first page load
 * goes idle, or right after a sign-in. Not from the For You page, which is already reading the feed.
 */
export function FypWarmUp() {
  const { user } = useUserClient();
  const isIdle = useIdleAfterLoad();
  const pathname = usePathname();
  // Read when the warm-up is due, not a reason to send it again on each navigation
  const pathnameRef = useRef(pathname);
  const account = user.isLoggedIn ? user.username : undefined;

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!configuredFypApiUrl || !account || !isIdle || pathnameRef.current === FOR_YOU_PATH) return;
    import('@/blog/lib/fyp-warm-up')
      .then(({ warmUpFypFeedOnce }) =>
        warmUpFypFeedOnce({
          baseUrl: configuredFypApiUrl,
          account,
          storage: window.sessionStorage,
          onFailure: logWarmUpFailure
        })
      )
      .catch(logWarmUpFailure);
  }, [account, isIdle]);

  return null;
}
