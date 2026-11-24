import { useEffect, useRef, useState } from 'react';
import type { OnlineClient } from '@hiveio/hb-auth';
import {
  PasskeyReplacedError,
  unlockWithPasskeyGivingPassword
} from '@smart-signer/lib/passkey-unlock/passkey-unlock';
import { PasskeyUnlockError } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import { KeyType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * How a sign-in's passkey unlock ended: the account it unlocked (the one asked for, or another
 * linked account whose passkey the user picked) and its password; the password form for `username`,
 * with `relink` where another passkey of the account answered and one password moves the record to
 * it, and `wrongAccount` where the passkey picked is of an account not linked on this device; or
 * nothing, the prompt aborted for another account.
 */
export type LinkedPasskeyOutcome =
  | { unlocked: true; username: string; password: string }
  | { unlocked: false; username: string; relink: boolean; wrongAccount: boolean }
  | null;

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The passkey unlock a safe-storage sign-in starts with, one prompt at a time: starting another,
 * for an account the user changed to, aborts the one open. A cancel leaves the account's record in
 * place. `failure` is why the last one failed, which a password sign-in of the account relinks.
 */
export function useLinkedPasskeyUnlock() {
  const pending = useRef<{ username: string; controller: AbortController } | null>(null);
  const failure = useRef<unknown>(null);
  const [relinkUsername, setRelinkUsername] = useState<string | null>(null);

  useEffect(() => () => pending.current?.controller.abort(), []);

  /** Aborts the prompt open for an account other than `username`; whether one was open */
  function abortOtherThan(username: string): boolean {
    if (!pending.current || pending.current.username === username) return false;
    pending.current.controller.abort();
    pending.current = null;
    return true;
  }

  async function unlock(
    client: OnlineClient,
    username: string,
    keyType: KeyType,
    accounts: readonly string[]
  ): Promise<LinkedPasskeyOutcome> {
    pending.current?.controller.abort();
    const controller = new AbortController();
    const mine = { username, controller };
    pending.current = mine;
    failure.current = null;
    setRelinkUsername(null);
    // Minimal verification for the posting key, like the old WIF-in-session experience
    const userVerification = keyType === KeyType.posting ? 'discouraged' : 'required';
    try {
      const unlocked = await unlockWithPasskeyGivingPassword(client, username, keyType, userVerification, {
        accounts,
        signal: controller.signal
      });
      return { unlocked: true, username: unlocked.username, password: unlocked.password };
    } catch (error) {
      if (controller.signal.aborted) return null;
      failure.current = error;
      logger.info('Passkey unlock of %s failed, asking for the password: %s', username, describe(error));
      const relink = error instanceof PasskeyReplacedError;
      if (relink) setRelinkUsername(error.username);
      return {
        unlocked: false,
        username: relink ? error.username : username,
        relink,
        wrongAccount: error instanceof PasskeyUnlockError && error.reason === 'wrong-account'
      };
    } finally {
      if (pending.current === mine) pending.current = null;
    }
  }

  return {
    unlock,
    abortOtherThan,
    /** Why the last unlock failed: one that found another passkey keeps the password under it */
    failure: () => failure.current,
    /** The account whose next password sign-in moves its record to the passkey that answered */
    relinkUsername
  };
}
