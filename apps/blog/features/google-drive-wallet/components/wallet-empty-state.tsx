'use client';

import { useTranslation } from '@/blog/i18n/client';
import { Button } from '@ui/components/button';

interface WalletEmptyStateProps {
  hasWalletFile: boolean;
  onCreateWallet: () => void;
}

/**
 * Empty state displayed when there is no wallet file on Google Drive
 * or when the wallet file exists but contains no configured keys.
 */
export function WalletEmptyState({ hasWalletFile, onCreateWallet }: WalletEmptyStateProps) {
  const { t } = useTranslation('common_blog');

  return (
    <div>
      <h2 className="py-4 text-lg font-semibold leading-5">
        {hasWalletFile
          ? t('google_drive_wallet.empty_state.wallet_empty_title')
          : t('google_drive_wallet.empty_state.no_wallet_title')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {hasWalletFile
          ? t('google_drive_wallet.empty_state.wallet_empty_description')
          : t('google_drive_wallet.empty_state.no_wallet_description')}
      </p>
      <Button className="my-4" onClick={onCreateWallet}>
        {t('google_drive_wallet.empty_state.create_wallet')}
      </Button>
    </div>
  );
}
