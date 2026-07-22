'use client';

import { useGDWTranslation } from '../i18n/context';
import { Button } from '@ui/components/button';
import { Skeleton } from '@ui/components/skeletons/skeleton';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface GoogleDriveConnectCardProps {
  isInitializing: boolean;
  onConnect: () => Promise<void>;
}

/**
 * Prompts the user to connect their Google Drive account.
 *
 * Renders two visual states:
 * 1. **Loading** (`isInitializing = true`) -- skeleton placeholder.
 * 2. **Not connected** -- informational section with a "Connect" CTA.
 */
export function GoogleDriveConnectCard({ isInitializing, onConnect }: GoogleDriveConnectCardProps) {
  const { t } = useGDWTranslation();
  const [isConnecting, setIsConnecting] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  }

  // ------------------------------------------------------------------
  // Loading skeleton
  // ------------------------------------------------------------------
  if (isInitializing) {
    return (
      <div role="status" aria-label={t('global.loading')}>
        <span className="sr-only">{t('global.loading')}</span>
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="mb-2 h-4 w-64" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="mt-4 h-10 w-36" />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Not connected state
  // ------------------------------------------------------------------
  return (
    <div>
      <h2 className="py-4 text-lg font-semibold leading-5">
        {t('google_drive_wallet.connect.title')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('google_drive_wallet.connect.description')}
      </p>

      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-0.5" aria-hidden="true">&bull;</span>
          <span>{t('google_drive_wallet.connect.benefit_safe_storage')}</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5" aria-hidden="true">&bull;</span>
          <span>{t('google_drive_wallet.connect.benefit_any_device')}</span>
        </li>
      </ul>

      <Button
        className="my-4"
        disabled={isConnecting}
        onClick={handleConnect}
      >
        {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('google_drive_wallet.connect.button')}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t('google_drive_wallet.connect.redirect_info')}
      </p>
    </div>
  );
}
