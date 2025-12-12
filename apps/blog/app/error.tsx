'use client';

import { useEffect } from 'react';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleError(error, { method: 'RootErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground">An unexpected error occurred. Please try again.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
