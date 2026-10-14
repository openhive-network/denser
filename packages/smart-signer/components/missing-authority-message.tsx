'use client';

import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import type { AuthorityRole } from '@transaction/lib/missing-authority';

const MESSAGE_KEYS: Record<AuthorityRole, string> = {
  owner: 'broadcast_error.missing_owner_authority',
  active: 'broadcast_error.missing_active_authority',
  posting: 'broadcast_error.missing_posting_authority'
};

/** Tells the user which key a broadcast rejected for missing `role` authority needs. */
export function MissingAuthorityMessage({ role }: { role: AuthorityRole }) {
  // The error toast can be the first thing on the page to need this namespace: render once it has loaded
  const { t, ready } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  if (!ready) return null;
  return (
    <p className="font-semibold text-white" data-testid="missing-authority-message">
      {t(MESSAGE_KEYS[role])}
    </p>
  );
}
