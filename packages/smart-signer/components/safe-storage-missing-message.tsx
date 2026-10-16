'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/** Tells the user safe storage holds no keys for the signed-in account, so they sign in again. */
export function SafeStorageMissingMessage() {
  // The toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return <p data-testid="safe-storage-missing-message">{t('broadcast_error.safe_storage_missing_account')}</p>;
}
