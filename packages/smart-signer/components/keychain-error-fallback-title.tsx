'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/** Error toast title for a Keychain failure that came without the extension's own answer. */
export function KeychainErrorFallbackTitle() {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return <span data-testid="keychain-error-fallback-title">{t('broadcast_error.keychain_no_message')}</span>;
}
