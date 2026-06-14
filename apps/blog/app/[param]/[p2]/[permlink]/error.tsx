'use client';

import { useEffect } from 'react';
import { handleError } from '@ui/lib/handle-error';
import ServiceUnavailable from '@/blog/components/service-unavailable';

// A genuinely-missing post is a `notFound()` (Next routes that to the not-found UI, not here), so
// any error that reaches this boundary means the render failed — e.g. a transport failure fetching
// the post (node unreachable / overloaded / timed out). Show the 503 "service unavailable" page
// rather than a misleading "post not found". See hive/denser#926.
export default function PostError({
  error,
  reset: _reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleError(error, { method: 'PostErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return <ServiceUnavailable />;
}
