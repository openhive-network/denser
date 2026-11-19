import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@smart-signer/types/common';
import { useLogout } from '@smart-signer/lib/auth/use-logout';
import { handleError } from '@ui/lib/handle-error';
import { keyChangeFollowUp, needsWalletUpdate } from '@/wallet/lib/account-keys';
import {
  authorityProblems,
  lockoutRisks,
  rolesLosingKeys,
  type LockoutRisk,
  type RoleAuthority
} from '@/wallet/lib/authority-checks';
import { isSafeStorageKeyType, removeSafeStorageKeys } from '@/wallet/lib/remove-safe-storage-keys';
import type { KeyMarks } from './use-key-marks';

interface GuardedAuthoritySubmitOptions {
  user: User;
  username: string;
  /** The authorities as the chain holds them */
  initial: readonly RoleAuthority[];
  /** The authorities as edited */
  current: readonly RoleAuthority[];
  marks: KeyMarks;
  submit: () => void;
  submitSuccess: boolean;
}

/**
 * Submits an authority change only when every role can still sign and, after the user confirmed
 * them, the ways it can lock the user out. After the change, removes the keys it took away from
 * safe storage, and signs the session out when it took away a key the session signs with.
 */
export function useGuardedAuthoritySubmit({
  user,
  username,
  initial,
  current,
  marks,
  submit,
  submitSuccess
}: GuardedAuthoritySubmitOptions) {
  const onLogout = useLogout();
  const problems = useMemo(() => authorityProblems(current), [current]);
  const [risks, setRisks] = useState<LockoutRisk[]>([]);
  // The change in flight, with the keys held before it: the authorities reload once it succeeded
  const submitted = useRef<{ before: readonly RoleAuthority[]; after: readonly RoleAuthority[]; marks: KeyMarks } | null>(
    null
  );

  const confirmSubmit = useCallback(() => {
    setRisks([]);
    submitted.current = { before: initial, after: current, marks };
    submit();
  }, [initial, current, marks, submit]);

  const requestSubmit = useCallback(() => {
    if (problems.length) return;
    const found = lockoutRisks({
      before: initial,
      after: current,
      sessionKeys: marks.session,
      passkeyKeys: marks.passkey,
      externalWallet: needsWalletUpdate(keyChangeFollowUp(user.loginType))
    });
    if (found.length) setRisks(found);
    else confirmSubmit();
  }, [problems, initial, current, marks, user.loginType, confirmSubmit]);

  const cancelSubmit = useCallback(() => setRisks([]), []);

  useEffect(() => {
    const change = submitted.current;
    if (!submitSuccess || !change) return;
    submitted.current = null;
    const { before, after, marks: held } = change;
    const removedStored = rolesLosingKeys(before, after, held.safeStorage).filter(isSafeStorageKeyType);
    const removedSession = rolesLosingKeys(before, after, held.session);
    removeSafeStorageKeys(username, removedStored)
      .catch((error: unknown) => handleError(error, { method: 'removeSafeStorageKeys', params: { username } }))
      .finally(() => {
        if (removedSession.length) void onLogout();
      });
  }, [submitSuccess, username, onLogout]);

  return { problems, risks, requestSubmit, confirmSubmit, cancelSubmit };
}
