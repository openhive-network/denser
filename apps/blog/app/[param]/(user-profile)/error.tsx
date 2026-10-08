'use client';

import { useEffect } from 'react';
import { handleError } from '@ui/lib/handle-error';
import ProfileLoadError from '@/blog/features/layouts/user-profile/profile-load-error';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    handleError(error, { method: 'ProfileErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return <ProfileLoadError reset={reset} />;
}
