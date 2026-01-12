'use client';

import { useEffect } from 'react';
import { Button } from '@hive/ui';
import { Icons } from '@ui/components/icons';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex flex-col items-center py-8">
      <Icons.hive className="h-16 w-16" />
      <h2 className="py-4 text-lg">Something went wrong!</h2>
      <Button onClick={() => reset()} variant="redHover">
        Try again
      </Button>
    </div>
  );
}
