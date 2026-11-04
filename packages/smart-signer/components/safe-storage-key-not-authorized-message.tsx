'use client';

import type { KeyAuthorityType } from '@hiveio/hb-auth';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

const MESSAGE_KEYS: Record<KeyAuthorityType, string> = {
  owner: 'broadcast_error.safe_storage_owner_key_not_authorized',
  active: 'broadcast_error.safe_storage_active_key_not_authorized',
  posting: 'broadcast_error.safe_storage_posting_key_not_authorized'
};

/** Tells the user the `keyType` key in safe storage no longer works for their account, and to add the current one. */
export function SafeStorageKeyNotAuthorizedMessage({ keyType }: { keyType: KeyAuthorityType }) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <p className="font-semibold text-white" data-testid="safe-storage-key-not-authorized-message">
      {t(MESSAGE_KEYS[keyType])}
    </p>
  );
}
