'use client';

import { useEffect } from 'react';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';
import { useRouter } from 'next/navigation';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    handleError(error, { method: 'ProfileErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h3 className="text-xl font-bold">Profile not found</h3>
      <p className="text-muted-foreground">We couldn't load this user profile.</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => router.push('/')}>Go home</Button>
      </div>
    </div>
  );
}
