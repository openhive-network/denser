'use client';

import { useQuery } from '@tanstack/react-query';
import type { GraduationRelay } from './lite-graduation';
import { relaysLink } from './lite-authority-state';
import type { StoredLiteIdentity } from './lite-identity-record';
import { liteRelayInfoQuery } from './lite-relay-info-query';

// No runtime import of @hiveio/lite-account here: the header uses this. The offer
// (`use-lite-graduation-offer`) comes with the menu items and the profile notice, the flow
// (`lite-graduation`) with the dialog.

/**
 * Whether `identity` may graduate here: the deployment's gateway graduates (`relaysLink`) and the
 * identity is registered and secured with a passkey, whose signer gives the new account its keys.
 */
export function useLiteGraduationAccess(identity: StoredLiteIdentity | null): {
  available: boolean;
  relay: GraduationRelay | null;
} {
  const { data } = useQuery(liteRelayInfoQuery);
  if (!data?.enabled || !relaysLink(data) || !identity?.registered || !identity.secured) {
    return { available: false, relay: null };
  }
  return { available: true, relay: { chainId: data.chain_id, accountApp: data.apps.account } };
}
