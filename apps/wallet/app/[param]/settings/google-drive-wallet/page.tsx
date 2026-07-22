'use client';

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { GoogleDriveWalletI18nProvider } from '@hive/google-drive-wallet';
import { useTranslation } from '@/wallet/i18n/client';

const LazyGoogleDriveKeyManager = lazy(() =>
  import('@hive/google-drive-wallet').then((m) => ({
    default: m.GoogleDriveKeyManager
  }))
);

export default function GoogleDriveWalletSettingsPage() {
  const { t } = useTranslation('common_wallet');

  return (
    <div className="m-auto flex max-w-2xl flex-col gap-4 bg-background p-4 pb-8">
      <GoogleDriveWalletI18nProvider t={t}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <LazyGoogleDriveKeyManager />
        </Suspense>
      </GoogleDriveWalletI18nProvider>
    </div>
  );
}
