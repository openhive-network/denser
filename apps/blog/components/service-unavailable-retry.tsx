'use client';

import { startTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import { useAutoRetry } from '@/blog/components/hooks/use-auto-retry';

/**
 * Retry actions for a route error boundary showing the service-unavailable page. Retrying re-runs
 * the server render (`router.refresh()`) and clears the boundary (`reset()`), so the route recovers
 * in place once an API node answers: automatically with backoff, or at once via the button.
 */
export default function ServiceUnavailableRetry({ reset }: { reset: () => void }) {
  const router = useRouter();
  const { t } = useTranslation('common_blog');

  const retry = useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);

  useAutoRetry(retry);

  return (
    <>
      <p
        className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
        data-testid="service-unavailable-reconnecting"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('global.reconnecting')}
      </p>
      <Button onClick={retry} className="gap-2" data-testid="service-unavailable-retry">
        <RefreshCw className="h-4 w-4" />
        {t('global.reload_page')}
      </Button>
    </>
  );
}
