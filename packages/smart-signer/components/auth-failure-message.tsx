'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/** Tells the user why safe storage or the key's authority check refused signing: the text of `messageKey`. */
export function AuthFailureMessage({ messageKey }: { messageKey: string }) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <p className="font-semibold text-white" data-testid="auth-failure-message">
      {t(messageKey)}
    </p>
  );
}
