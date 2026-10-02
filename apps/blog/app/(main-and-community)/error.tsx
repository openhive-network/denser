'use client';

import { useEffect } from 'react';
import { handleError } from '@ui/lib/handle-error';
import ServiceUnavailable from '@/blog/components/service-unavailable';
import ServiceUnavailableRetry from '@/blog/components/service-unavailable-retry';

// A feed whose posts could not be fetched server-side from any API node lands here (answered with
// HTTP 503). Retrying re-runs the server render, so the feed recovers in place once a node answers.
export default function TimelineError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleError(error, { method: 'TimelineErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return (
    <ServiceUnavailable>
      <ServiceUnavailableRetry reset={reset} />
    </ServiceUnavailable>
  );
}
