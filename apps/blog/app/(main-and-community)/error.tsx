'use client';

import { useEffect } from 'react';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';

export default function TimelineError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleError(error, { method: 'TimelineErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h3 className="text-xl font-bold">Failed to load timeline</h3>
      <p className="text-muted-foreground">We couldn't load the posts. Please try again.</p>
      <Button onClick={() => reset()}>Retry</Button>
    </div>
  );
}
