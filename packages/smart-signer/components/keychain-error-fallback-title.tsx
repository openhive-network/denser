'use client';

import type { KeychainFallback } from '@transaction/lib/transform-error';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

const FALLBACK_TITLE_KEYS: Record<KeychainFallback, string> = {
  no_message: 'broadcast_error.keychain_no_message',
  signing_failed: 'broadcast_error.keychain_signing_failed'
};

/** Error toast title for a Keychain failure whose own answer is missing or says nothing the app's text cannot. */
export function KeychainErrorFallbackTitle({ fallback }: { fallback: KeychainFallback }) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <span data-testid="keychain-error-fallback-title" data-fallback={fallback}>
      {t(FALLBACK_TITLE_KEYS[fallback])}
    </span>
  );
}
