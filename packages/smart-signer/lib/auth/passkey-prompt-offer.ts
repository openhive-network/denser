import type { OfflineClient, OnlineClient } from '@hiveio/hb-auth';
import { isPasskeyPromptDismissed } from '@smart-signer/lib/auth/passkey-prompt-dismissal';

/** What offering the passkey unlock needs of an hb-auth client, online or offline */
export type PasskeyOfferClient = Pick<OnlineClient | OfflineClient, 'isPasskeySupported' | 'hasPasskey'>;

/**
 * Whether to offer `username` a passkey (fingerprint, Face ID, device PIN) to unlock safe storage
 * with after a password sign-in: the browser supports it, this device has no passkey unlock of the
 * user (a passkey unlock that failed keeps a record only where its passkey may still answer, so
 * enabling again would replace the passkey other devices use), and the user has not dismissed the
 * offer. False on any error: the offer is not worth failing the sign-in for.
 */
export async function shouldOfferPasskey(client: PasskeyOfferClient, username: string): Promise<boolean> {
  try {
    const supported = await client.isPasskeySupported();
    const hasPasskey = await client.hasPasskey(username);
    return supported && !hasPasskey && !isPasskeyPromptDismissed(username);
  } catch {
    return false;
  }
}
