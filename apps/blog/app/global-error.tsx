'use client';

import { useEffect } from 'react';
import { handleError } from '@ui/lib/handle-error';
import ServiceUnavailable from '@/blog/components/service-unavailable';

export default function GlobalError({
  error,
  reset: _reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleError(error, { method: 'GlobalErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ServiceUnavailable />
      </body>
    </html>
  );
}
