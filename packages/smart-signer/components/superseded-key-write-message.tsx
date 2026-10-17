'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { SUPERSEDED_KEY_WRITE_MESSAGE, type SupersededKeyWrite } from '@smart-signer/lib/superseded-key-write';

/** Tells the user another tab interrupted saving a key to safe storage, so they add it again. */
export function SupersededKeyWriteMessage({ username, keyType }: SupersededKeyWrite) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <p className="font-semibold text-white" data-testid="superseded-key-write-message">
      {t(SUPERSEDED_KEY_WRITE_MESSAGE, { username, keyType })}
    </p>
  );
}
