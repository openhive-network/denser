'use client';

import { startTransition, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '@/blog/i18n/client';
import ServiceUnavailable from '@/blog/components/service-unavailable';

// A feed whose posts could not be fetched server-side from any API node lands here (answered with
// HTTP 503). Retrying re-runs the server render, so the feed recovers in place once a node answers.
export default function TimelineError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation('common_blog');

  useEffect(() => {
    handleError(error, { method: 'TimelineErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  const retry = useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);

  return (
    <ServiceUnavailable>
      <Button onClick={retry} className="gap-2" data-testid="service-unavailable-retry">
        <RefreshCw className="h-4 w-4" />
        {t('global.reload_page')}
      </Button>
    </ServiceUnavailable>
  );
}
