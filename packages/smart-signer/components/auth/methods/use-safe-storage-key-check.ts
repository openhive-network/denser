import { useEffect, useRef } from 'react';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import type { KeyType } from '@smart-signer/types/common';
import type { KeyHint } from '@smart-signer/lib/validators/key-role-hint';
import { validateSafeStorageKey } from '@smart-signer/lib/validators/validate-key-authority';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';

/** What the key of a safe-storage form is checked against */
export interface KeyCheckFields {
  username: string;
  keyType: KeyType;
  wif: string;
  strict: boolean;
}

export interface SafeStorageKeyCheckOptions {
  i18nNamespace: string;
  /** The form's current values */
  fields: KeyCheckFields;
  /** Shows `message` under the key field */
  showKeyError: (message: string) => void;
  /** Runs the form's own validation of the key field; resolves with whether it passed */
  revalidateKey: () => Promise<boolean>;
}

function isSameCheck(a: KeyCheckFields, b: KeyCheckFields): boolean {
  return a.username === b.username && a.keyType === b.keyType && a.wif === b.wif && a.strict === b.strict;
}

/**
 * The key-authority check of the safe-storage forms that store a key, and of the WIF key prompt
 * (`validateSafeStorageKey`): run when the key or account field loses focus (`checkEnteredKey`),
 * again when the key type or Direct Authority Mode changes, and on submit. A refusal is shown under the key field, which keeps the key,
 * only while the form still holds what was checked; changing the account drops it.
 */
export function useSafeStorageKeyCheck({ i18nNamespace, fields, showKeyError, revalidateKey }: SafeStorageKeyCheckOptions) {
  // Also run in the WIF key prompt of transaction signing, which must not suspend for the namespace
  const { t } = useSharedTranslation(i18nNamespace, { useSuspense: false });
  const current = useRef(fields);
  current.current = fields;

  /** Names the key the sign-in needs: an authorised account's key is taken once the mode is unticked */
  function showKeyHint({ key, values }: KeyHint) {
    const mode = t('login_form.signin_safe_storage.strict_mode', { ns: SMART_SIGNER_NAMESPACE });
    showKeyError(t(key, { ns: SMART_SIGNER_NAMESPACE, mode, ...values }));
  }

  /** Resolves false, showing why while the form still holds `checked`, when the key is refused */
  async function checkKey(checked: KeyCheckFields): Promise<boolean> {
    const hint = await validateSafeStorageKey(checked.username, checked.keyType, checked.wif, checked.strict);
    if (!hint) return true;
    if (isSameCheck(checked, current.current)) showKeyHint(hint);
    return false;
  }

  /** Checks a well-formed key of a named account; the form's own validation tells about any other */
  async function checkEnteredKey() {
    const checked = current.current;
    if (!checked.username || !checked.wif || (await validateWifKey(checked.wif))) return;
    await checkKey(checked);
  }

  useEffect(() => {
    if (!current.current.wif) return;
    // The form's validation first: it replaces a refusal given for the previous choice
    revalidateKey().then((valid) => {
      if (valid) return checkEnteredKey();
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [fields.keyType, fields.strict]);

  // A refusal is about the account it was given for: the form's validation replaces it, and the
  // account field's blur checks the key for the new account, not each letter typed
  useEffect(() => {
    if (current.current.wif) revalidateKey();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [fields.username]);

  return { checkKey, checkEnteredKey, showKeyHint };
}
