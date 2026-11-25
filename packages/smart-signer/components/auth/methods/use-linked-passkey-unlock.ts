import { useEffect, useRef, useState } from 'react';
import type { OnlineClient } from '@hiveio/hb-auth';
import {
  PasskeyReplacedError,
  unlockWithPasskeyGivingPassword
} from '@smart-signer/lib/passkey-unlock/passkey-unlock';
import { PasskeyUnlockError } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';
import {
  clearPasskeyUnlockFailures,
  countPasskeyUnlockFailure,
  FAILED_UNLOCKS_BEFORE_NOTICE
} from '@smart-signer/lib/passkey-unlock/passkey-unlock-failures';
import { KeyType } from '@smart-signer/types/common';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * How a sign-in's passkey unlock ended: the account it unlocked (the one asked for, or another
 * linked account whose passkey the user picked) and its password; the password form for `username`,
 * with `relink` where another passkey of the account answered and one password moves the record to
 * it, `wrongAccount` where the passkey picked is of an account not linked on this device, and
 * `failingRepeatedly` where no passkey answered for the account at this sign-in and the ones before
 * it; or nothing, the prompt aborted for another account.
 */
export type LinkedPasskeyOutcome =
  | { unlocked: true; username: string; password: string }
  | { unlocked: false; username: string; relink: boolean; wrongAccount: boolean; failingRepeatedly: boolean }
  | null;

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

const failedWith = (error: unknown, reason: PasskeyUnlockError['reason']) =>
  error instanceof PasskeyUnlockError && error.reason === reason;

/**
 * Whether `error` is a request no passkey answered: cancelled (as the browser answers a passkey it
 * no longer reaches) or ended without a credential. It is counted, never taken for a removed passkey.
 */
const isUnanswered = (error: unknown) => failedWith(error, 'cancelled') || failedWith(error, 'failed');

/**
 * The passkey request open on this page, whichever sign-in form asked it: the browser runs one at a
 * time and refuses another while one is open, so a form opened again must not leave the last one's
 */
let openRequest: AbortController | null = null;

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
    openRequest?.abort();
    const controller = new AbortController();
    const mine = { username, controller };
    pending.current = mine;
    openRequest = controller;
    failure.current = null;
    setRelinkUsername(null);
    // Minimal verification for the posting key, like the old WIF-in-session experience
    const userVerification = keyType === KeyType.posting ? 'discouraged' : 'required';
    try {
      const unlocked = await unlockWithPasskeyGivingPassword(client, username, keyType, userVerification, {
        accounts,
        signal: controller.signal
      });
      clearPasskeyUnlockFailures(unlocked.username);
      return { unlocked: true, username: unlocked.username, password: unlocked.password };
    } catch (error) {
      if (controller.signal.aborted) return null;
      failure.current = error;
      logger.info('Passkey unlock of %s failed, asking for the password: %s', username, describe(error));
      const relink = error instanceof PasskeyReplacedError;
      if (relink) setRelinkUsername(error.username);
      const failures = isUnanswered(error) ? countPasskeyUnlockFailure(username) : 0;
      return {
        unlocked: false,
        username: relink ? error.username : username,
        relink,
        wrongAccount: failedWith(error, 'wrong-account'),
        failingRepeatedly: failures >= FAILED_UNLOCKS_BEFORE_NOTICE
      };
    } finally {
      if (pending.current === mine) pending.current = null;
      if (openRequest === controller) openRequest = null;
    }
  }

  return {
    unlock,
    abortOtherThan,
    /** Whether the prompt open is `username`'s */
    isAsking: (username: string) => pending.current?.username === username,
    /** Why the last unlock failed: one that found another passkey keeps the password under it */
    failure: () => failure.current,
    /** The account whose next password sign-in moves its record to the passkey that answered */
    relinkUsername
  };
}
