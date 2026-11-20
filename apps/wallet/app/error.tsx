'use client';

import { useEffect } from 'react';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '@/wallet/i18n/client';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation('common_wallet');
  useEffect(() => {
    handleError(error, { method: 'RootErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-2xl font-bold">{t('global.something_went_wrong')}</h2>
      <p className="text-muted-foreground">{t('global.unexpected_error')}</p>
      <Button onClick={() => reset()}>{t('global.retry')}</Button>
    </div>
  );
}
