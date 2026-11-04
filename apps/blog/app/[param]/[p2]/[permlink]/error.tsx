'use client';

import { useEffect } from 'react';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '@/blog/i18n/client';
import ServiceUnavailable from '@/blog/components/service-unavailable';
import ServiceUnavailableRetry from '@/blog/components/service-unavailable-retry';
import { isServiceUnavailableError } from '@/blog/lib/service-unavailable';

// A genuinely-missing post is a `notFound()` (Next routes that to the not-found UI, not here). A
// transport failure fetching the post (node unreachable / overloaded / timed out) is a
// `ServiceUnavailableError`: show the 503 "service unavailable" page rather than a misleading
// "post not found" (see hive/denser#926), and retry the render a bounded number of times. Any other
// error is not fixed by waiting, so it is shown with a manual retry only.
export default function PostError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation('common_blog');

  useEffect(() => {
    handleError(error, { method: 'PostErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  if (!isServiceUnavailableError(error)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8" data-testid="post-load-error">
        <h3 className="text-xl font-bold">{t('global.something_went_wrong')}</h3>
        <ServiceUnavailableRetry error={error} reset={reset} />
      </div>
    );
  }

  return (
    <ServiceUnavailable>
      <ServiceUnavailableRetry error={error} reset={reset} />
    </ServiceUnavailable>
  );
}
