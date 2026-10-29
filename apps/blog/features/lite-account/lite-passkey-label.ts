import type { LiteAuthorityView } from '@hiveio/lite-account';
import { keyMembers, metaText } from './lite-authority-state.ts';
import type { SignerAuthenticator } from '@smart-signer/lib/passkey/signer-client';

// What the account's passkeys are called: the owner members' labels, and what the signer reports.
// Kept out of lite-authority-state, which the header loads on every page.

export type PasskeyRow = { key: string; kind: 'passkey' | 'backup'; label?: string; active: boolean };

/** The owner members a passkey holds (`kind: passkey` and `kind: backup`), as the Devices tab lists them. */
export function passkeyMembers(view: LiteAuthorityView): PasskeyRow[] {
  return keyMembers(view, 'owner').flatMap((member) => {
    const kind = member.meta?.kind;
    if (kind !== 'passkey' && kind !== 'backup') return [];
    const label = metaText(member, 'label');
    return [{ key: member.value, kind, active: member.active, ...(label ? { label } : {}) }];
  });
}

/** The label a passkey member gets from the signer's report: its model name, else its description. */
export const authenticatorLabel = (authenticator: SignerAuthenticator | undefined): string | undefined =>
  authenticator?.name || authenticator?.description || undefined;

/**
 * The public part of the signer's report that the passkey member's `meta.authenticator` records:
 * attachment, AAGUID and model name, each only when known; undefined when none is.
 */
export function authenticatorMeta(
  authenticator: SignerAuthenticator | undefined
): Record<string, string> | undefined {
  if (!authenticator) return undefined;
  const known = Object.entries({
    attachment: authenticator.attachment,
    aaguid: authenticator.aaguid,
    name: authenticator.name
  }).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '');
  return known.length ? Object.fromEntries(known) : undefined;
}
