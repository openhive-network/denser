'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { configuredPasskeySigners } from '@ui/config/public-vars';
import { getLogger } from '@ui/lib/logging';
import { rememberPasskeyBinding } from '@smart-signer/lib/passkey/passkey-binding';
import { openSignerPopup, SignerError, type SignerPopup } from '@smart-signer/lib/passkey/signer-client';
import { liteAuthorityErrorKey } from './lite-authority-errors';
import { GRADUATION_ROLES, graduateLiteAccount, retryLiteLink, type GraduationStep } from './lite-graduation';
import { liteGraduationKey } from './lite-graduation-query';
import { graduationErrorKey } from './lite-graduation-state';
import { graduatedIdentity } from './lite-identity-record';
import { useLiteGraduationAccess } from './use-lite-graduation';
import { useStoredLiteIdentityState } from './use-stored-lite-identity';

const logger = getLogger('app');

/**
 * Where the dialog is: picking the name (with the last attempt's error, if any), running a step,
 * done, or the account created but its link not confirmed (retrying, or with the retry's error).
 */
export type GraduationFlowState =
  | { phase: 'name'; error?: string }
  | { phase: 'running'; step: GraduationStep }
  | { phase: 'done'; account: string }
  | { phase: 'link_failed'; account: string; retrying: boolean; error?: string };

/** A failure's message key: the signer's, or the gateway's; null for a cancelled signer popup. */
const failureKey = (error: unknown): string | null =>
  error instanceof SignerError ? liteAuthorityErrorKey(error) : graduationErrorKey(error);

/**
 * The graduation dialog's flow for the browser's lite identity. `start` opens the signer popup (call
 * it from the click) and runs the graduation; once the account exists the stored identity records
 * it and the signer is remembered as the account's, so it can sign in in one click. `retryLink`
 * relays the link again. `pendingLink` starts on the retry, for an account created earlier.
 */
export function useLiteGraduationFlow(pendingLink?: string) {
  const queryClient = useQueryClient();
  const [identity, store] = useStoredLiteIdentityState();
  const { relay } = useLiteGraduationAccess(identity);
  const [state, setState] = useState<GraduationFlowState>(() =>
    pendingLink ? { phase: 'link_failed', account: pendingLink, retrying: false } : { phase: 'name' }
  );

  const refresh = () => {
    if (identity) void queryClient.invalidateQueries({ queryKey: liteGraduationKey(identity.name) });
  };

  const start = (account: string) => {
    if (!identity || !relay) return;
    let popup: SignerPopup;
    try {
      popup = openSignerPopup(identity.signer ?? configuredPasskeySigners[0]);
    } catch (error) {
      setState({ phase: 'name', error: failureKey(error) ?? undefined });
      return;
    }
    const readKeys = async () => {
      const roles = [GRADUATION_ROLES.owner, GRADUATION_ROLES.active, GRADUATION_ROLES.posting, GRADUATION_ROLES.memo];
      return (await popup.call('getPublicKeys', { roles, account: 0 })).keys;
    };
    void graduateLiteAccount({
      identity,
      account,
      readKeys,
      relay,
      onStep: (step) => {
        if (step !== 'keys') popup.close();
        setState({ phase: 'running', step });
      },
      onCreated: (created, keys) => {
        store(graduatedIdentity(identity, created));
        rememberPasskeyBinding(created, { origin: popup.origin, publicKey: keys.posting });
      }
    })
      .then(({ account: created, linked }) =>
        setState(linked ? { phase: 'done', account: created } : { phase: 'link_failed', account: created, retrying: false })
      )
      .catch((error: unknown) => {
        const key = failureKey(error);
        if (key) logger.error(error, 'Lite account graduation failed');
        setState({ phase: 'name', error: key ?? undefined });
      })
      .finally(() => {
        popup.close();
        refresh();
      });
  };

  const retryLink = (account: string) => {
    if (!identity || !relay) return;
    setState({ phase: 'link_failed', account, retrying: true });
    void retryLiteLink({ identity, account, relay })
      .then((linked) =>
        setState(
          linked
            ? { phase: 'done', account }
            : { phase: 'link_failed', account, retrying: false, error: 'lite_account.graduation.link_not_shown' }
        )
      )
      .catch((error: unknown) => {
        logger.error(error, 'Lite account link retry failed');
        setState({ phase: 'link_failed', account, retrying: false, error: graduationErrorKey(error) });
      })
      .finally(refresh);
  };

  return { identity, state, start, retryLink };
}
