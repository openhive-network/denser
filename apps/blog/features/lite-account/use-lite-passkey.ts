'use client';

import { useQuery } from '@tanstack/react-query';
import { configuredPasskeySigners } from '@ui/config/public-vars';
import { liteAuthorityQuery } from './lite-authority-query';
import {
  passkeyRoot,
  relaysUpdateAuthority,
  securityWarning,
  type SecurityNotice
} from './lite-authority-state';
import type { AuthorityRelay } from './lite-authority-flows';
import type { StoredLiteIdentity } from './lite-identity-record';
import { liteRelayInfoQuery } from './lite-relay-info-query';

// No runtime import of @hiveio/lite-account here: the header uses these. The flow runner
// (`use-passkey-flow`) comes with the dialogs, the flows (`lite-authority-flows`) on the click.

/**
 * Whether the deployment configures a passkey signer and its gateway relays lite authority edits,
 * and the gateway's chain and lite_account app when both hold. Otherwise no passkey UI is shown.
 */
export function useLitePasskeyAccess(): { available: boolean; relay: AuthorityRelay | null } {
  const { data } = useQuery(liteRelayInfoQuery);
  if (configuredPasskeySigners.length === 0 || !data?.enabled || !relaysUpdateAuthority(data))
    return { available: false, relay: null };
  return { available: true, relay: { chainId: data.chain_id, accountApp: data.apps.account } };
}

/** The lite account `name`'s authority, read through the gateway while `enabled`. */
export function useLiteAuthority(name: string | undefined, enabled: boolean) {
  return useQuery({ ...liteAuthorityQuery(name ?? ''), enabled: enabled && !!name });
}

/**
 * The security warning for the browser's registered lite identity, where the gateway relays
 * authority edits: from the account's authority (read while `enabled`), with its passkey's label
 * when it has one, or, until it is read, from whether this browser secured it. An unregistered
 * identity has nothing on chain to secure yet.
 */
export function useLiteSecurityWarning(
  identity: StoredLiteIdentity | null,
  enabled: boolean
): SecurityNotice | null {
  const { available } = useLitePasskeyAccess();
  const registered = !!identity?.registered;
  const authority = useLiteAuthority(identity?.name, available && enabled && registered);
  if (!available || !registered || !identity) return null;
  if (!authority.data) return identity.secured ? null : { warning: 'unsecured' };
  const warning = securityWarning(authority.data);
  if (!warning) return null;
  const passkeyLabel = passkeyRoot(authority.data)?.label;
  return passkeyLabel ? { warning, passkeyLabel } : { warning };
}

/** How a signer origin is shown: its host. */
export const signerHostname = (origin: string): string => new URL(origin).host;
