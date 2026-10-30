'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/** Tells the user an operation was not signed because they are signed out, so they sign in first. */
export function SignedOutMessage() {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <p className="font-semibold text-white" data-testid="signed-out-message">
      {t('broadcast_error.signed_out')}
    </p>
  );
}
