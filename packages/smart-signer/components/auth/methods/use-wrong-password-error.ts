import { useEffect, useState } from 'react';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

/**
 * Safe storage's refusal of the password a form submitted: `message` is held until the password
 * field is edited or emptied, or `clear` is called.
 */
export function useWrongPasswordError(i18nNamespace: string, password: string) {
  const { t } = useSharedTranslation(i18nNamespace);
  const [refusedPassword, setRefusedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (refusedPassword !== null && password !== refusedPassword) setRefusedPassword(null);
  }, [password, refusedPassword]);

  const message =
    refusedPassword !== null && refusedPassword === password
      ? t('broadcast_error.wrong_safe_storage_password', { ns: SMART_SIGNER_NAMESPACE })
      : null;

  return {
    message,
    /** Shows the refusal of `refused`, the password submitted */
    refuse: (refused: string) => setRefusedPassword(refused),
    clear: () => setRefusedPassword(null)
  };
}
