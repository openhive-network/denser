'use client';

import { useEffect } from 'react';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import ProfileLoadError from '@/blog/features/layouts/user-profile/profile-load-error';

const PROFILE_SEGMENT = '(user-profile)';

export default function ParamError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();

  useEffect(() => {
    handleError(error, { method: 'ParamErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  // A profile layout's own error (e.g. its account lookup failed) reaches this boundary, not the
  // profile's error.tsx, which only wraps the layout's children.
  if (segment === PROFILE_SEGMENT) return <ProfileLoadError reset={reset} />;

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h3 className="text-xl font-bold">Something went wrong</h3>
      <p className="text-muted-foreground">We couldn't load this page. Please try again.</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => router.push('/')}>
          Go home
        </Button>
      </div>
    </div>
  );
}
