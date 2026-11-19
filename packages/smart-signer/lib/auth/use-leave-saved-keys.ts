'use client';

import { useCallback } from 'react';
import { toast } from '@ui/components/hooks/use-toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { settleStoredKeysBeforeLeaving } from '@smart-signer/lib/auth/key-protection';
import { leaveSteps, type LeaveKind } from '@smart-signer/lib/auth/key-protection-browser';

const logger = getLogger('app');

/**
 * Returns the check run before `kind` deletes the keys of `usernames` saved unprotected in this
 * browser: when one is saved, asks whether to protect it with safe storage, forget it, or cancel,
 * and does so. Resolves whether to go on; false on "Cancel", a closed password prompt or a failed
 * import, which keep the keys saved and report the failure.
 */
export function useLeaveSavedKeys(): (usernames: readonly string[], kind: LeaveKind) => Promise<boolean> {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });

  return useCallback(
    async (usernames, kind) => {
      const onProtected = () => toast({ description: t('key_protection.protected'), variant: 'success' });
      try {
        return await settleStoredKeysBeforeLeaving(usernames, leaveSteps(kind, onProtected));
      } catch (error) {
        logger.error(error, 'Moving the saved keys of %s into safe storage failed; they stay saved', usernames);
        const { handleError } = await import('@ui/lib/handle-error');
        handleError(error, { method: 'settleStoredKeysBeforeLeaving', params: { usernames } });
        return false;
      }
    },
    [t]
  );
}
