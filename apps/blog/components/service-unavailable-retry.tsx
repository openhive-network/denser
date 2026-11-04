'use client';

import { startTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import { useAutoRetry } from '@/blog/components/hooks/use-auto-retry';
import { isServiceUnavailableError } from '@/blog/lib/service-unavailable';

type RetryProps = { reset: () => void };

/** Re-runs the server render (`router.refresh()`) and clears the boundary (`reset()`). */
function useRouteRetry(reset: () => void): () => void {
  const router = useRouter();
  return useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('common_blog');
  return (
    <Button onClick={onRetry} className="gap-2" data-testid="service-unavailable-retry">
      <RefreshCw className="h-4 w-4" />
      {t('global.reload_page')}
    </Button>
  );
}

function ManualRetry({ reset }: RetryProps) {
  return <RetryButton onRetry={useRouteRetry(reset)} />;
}

function AutoRetry({ reset }: RetryProps) {
  const { t } = useTranslation('common_blog');
  const retry = useRouteRetry(reset);
  const { exhausted } = useAutoRetry(retry);

  return (
    <>
      {exhausted ? (
        <p
          className="flex w-full items-center justify-center text-sm text-muted-foreground"
          role="status"
          data-testid="service-unavailable-gave-up"
        >
          {t('global.could_not_load')}
        </p>
      ) : (
        <p
          className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
          data-testid="service-unavailable-reconnecting"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('global.reconnecting')}
        </p>
      )}
      <RetryButton onRetry={retry} />
    </>
  );
}

/**
 * Retry actions for a route error boundary. Retrying re-runs the server render and clears the
 * boundary, so the route recovers in place. A `ServiceUnavailableError` (no API node answered) is
 * retried automatically with backoff, a bounded number of times; any error can be retried at once
 * via the button.
 */
export default function ServiceUnavailableRetry({ error, reset }: RetryProps & { error: unknown }) {
  return isServiceUnavailableError(error) ? <AutoRetry reset={reset} /> : <ManualRetry reset={reset} />;
}
