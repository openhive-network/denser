import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';
import { withTranslatedErrors } from '@smart-signer/lib/validators/translated-errors';
import { newPasswordSchema } from '@smart-signer/lib/validators/validate-password';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { getLogger } from '@ui/lib/logging';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import SessionTimeNote from '@smart-signer/components/session-time-note';
import { Icons } from '@ui/components/icons';
import type { OperationSummary } from '@smart-signer/lib/signer/operation-summary';
import { KeyType } from '@smart-signer/types/common';
import { useSafeStorageKeyCheck } from '@smart-signer/components/auth/methods/use-safe-storage-key-check';

const logger = getLogger('app');

export enum PasswordFormMode {
  HBAUTH = 'hbauth',
  WIF = 'wif'
}

// Hbauth password (de facto regular password): no maximum, a wallet set with a longer one still unlocks
const passwordHbauth = z.string().min(1, 'login_form.zod_error.password_required');

const passwordFormSchemaHbauth = z.object({
  password: passwordHbauth
});

const passwordFormSchemaNewHbauth = z.object({
  password: newPasswordSchema
});
export type PasswordFormSchemaHbauth = z.infer<typeof passwordFormSchemaHbauth>;

export const passwordFormDefaultValuesHbauth = {
  password: ''
};

// Wif password

export const passwordWif = z.string().superRefine(async (val, ctx) => {
  const result = await validateWifKey(val);
  if (result) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result,
      fatal: true
    });
    return z.NEVER;
  }
  return true;
});

/**
 * How long an entered WIF key is kept: not at all (''), in this tab's memory ('tab'), or on this
 * device, in safe storage behind a password ('device')
 */
export type RememberKey = '' | 'tab' | 'device';

const passwordFormSchemaWif = z.object({
  password: passwordWif,
  rememberKey: z.enum(['', 'tab', 'device'])
});
export type PasswordFormSchemaWif = z.infer<typeof passwordFormSchemaWif>;

export const passwordFormDefaultValuesWif: PasswordFormSchemaWif = {
  password: '',
  rememberKey: ''
};

const REMEMBER_KEY_CHOICES: { value: Exclude<RememberKey, ''>; label: string; testId: string }[] = [
  { value: 'tab', label: 'password_form.remember_key_tab_label', testId: 'remember-key-tab' },
  { value: 'device', label: 'password_form.remember_key_device_label', testId: 'remember-key-device' }
];

// smart-signer translation keys of the captions for inputs, buttons, form title etc.
export interface PasswordFormI18nKeysForCaptions {
  title?: string;
  description?: string;
  inputPasswordPlaceholder?: string;
  submitButtonName?: string;
  submitButtonNameWhenWorking?: string;
  cancelButtonName?: string;
}

export interface PasswordFormOptions {
  mode?: PasswordFormMode;
  /** The password entered is chosen for a new safe storage wallet, held to its rules; HBAUTH mode only */
  isNewPassword?: boolean;
  /** Offers to remember the entered WIF key for this tab or on this device (`rememberKey`); WIF mode only */
  showRememberKey?: boolean;
  errorMessage?: string;
  onSubmit?: (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => any;
  /** Closes the form without submitting anything. */
  onCancel?: () => void;
  /**
   * Checks the entered password once the form's own validation passed. Resolves with a
   * smart-signer translation key to keep the form open with that error and the password cleared,
   * or null to submit.
   */
  validatePassword?: (password: string) => Promise<string | null>;
  /**
   * The account and key type the entered WIF key must sign as; WIF mode only. The key is checked
   * as safe storage's forms check theirs (`useSafeStorageKeyCheck`), with Direct Authority Mode off:
   * when its field loses focus, and on submit, which a refused key keeps open with the key kept.
   */
  keyAuthority?: { username: string; keyType: KeyType };
  i18nKeysForCaptions?: PasswordFormI18nKeysForCaptions;
  /** Interpolation values of the caption translations, e.g. `{ keyType: 'active' }` */
  i18nValues?: Record<string, string>;
  /** The operation the entered password or key signs, stated under the title */
  operation?: OperationSummary;
  /** Id given to the form's title, so a surrounding dialog can be labelled by it. */
  titleId?: string;
  /** Shows how long the safe-storage session the password unlocks stays unlocked while idle */
  showSessionTime?: boolean;
  /**
   * The password field's `autoComplete`. `one-time-code` keeps the browser from filling in a saved
   * password, for a check that the user types in every time.
   */
  autoComplete?: 'current-password' | 'one-time-code';
  /**
   * Offers a passkey button in place of the password. Called first thing in the button's click, as
   * Face ID and Touch ID start only from a user's gesture; resolves as `validatePassword` does, and
   * submits the form, without a password, on null.
   */
  checkPasskey?: () => Promise<string | null>;
}

export function PasswordForm({
  mode = PasswordFormMode.HBAUTH,
  isNewPassword = false,
  showRememberKey = false,
  errorMessage = '',
  onSubmit = (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => {},
  onCancel = () => {},
  validatePassword,
  keyAuthority,
  i18nKeysForCaptions = {}, // captions for inputs, buttons, form title etc.
  i18nValues,
  operation,
  titleId,
  showSessionTime = false,
  autoComplete = 'current-password',
  checkPasskey
}: PasswordFormOptions) {
  // Also rendered for transaction signing, where the namespace may not be loaded yet: don't suspend.
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const randomValue = crypto.randomUUID();

  const defaultI18nKeysForCaptions = {
    title: 'password_form.password_form_title',
    description: '',
    inputPasswordPlaceholder: 'password_form.password_placeholder',
    submitButtonName: 'login_form.login_button',
    submitButtonNameWhenWorking: 'login_form.working',
    cancelButtonName: 'login_form.cancel_button'
  };
  const captionKey: Required<PasswordFormI18nKeysForCaptions> = {
    ...defaultI18nKeysForCaptions,
    ...i18nKeysForCaptions
  };
  const caption = (key: string) => (key ? t(key, i18nValues) : '');

  let resolver;
  let passwordFormDefaultValues;
  if (mode === PasswordFormMode.HBAUTH) {
    resolver = isNewPassword ? passwordFormSchemaNewHbauth : passwordFormSchemaHbauth;
    passwordFormDefaultValues = passwordFormDefaultValuesHbauth;
  } else if (mode === PasswordFormMode.WIF) {
    resolver = passwordFormSchemaWif;
    passwordFormDefaultValues = passwordFormDefaultValuesWif;
  } else {
    throw new Error('Invalid mode');
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    resetField,
    setError,
    watch,
    setValue,
    trigger
  } = useForm<PasswordFormSchemaHbauth | PasswordFormSchemaWif>({
    resolver: withTranslatedErrors(zodResolver(resolver), (key) => t(key)),
    defaultValues: passwordFormDefaultValues
  });

  const [isCheckingPasskey, setIsCheckingPasskey] = useState(false);

  const submitWithPasskey = async () => {
    if (!checkPasskey) return;
    const checking = checkPasskey();
    setIsCheckingPasskey(true);
    try {
      const errorKey = await checking;
      if (errorKey) {
        setError('password', { message: t(errorKey) });
        return;
      }
      await onSubmit({ password: '' });
    } finally {
      setIsCheckingPasskey(false);
    }
  };

  // Two boxes for one choice: ticking one unticks the other
  const rememberKey = watch('rememberKey');

  const keyCheckFields = {
    username: keyAuthority?.username ?? '',
    keyType: keyAuthority?.keyType ?? KeyType.posting,
    wif: watch('password'),
    strict: false
  };
  const keyCheck = useSafeStorageKeyCheck({
    i18nNamespace: SMART_SIGNER_NAMESPACE,
    fields: keyCheckFields,
    showKeyError: (message) => setError('password', { message }),
    revalidateKey: () => trigger('password')
  });
  const passwordField = register('password');

  const submitIfValid = async (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => {
    if (keyAuthority && !(await keyCheck.checkKey({ ...keyCheckFields, wif: data.password }))) return;
    const errorKey = await validatePassword?.(data.password);
    if (errorKey) {
      resetField('password');
      setError('password', { message: t(errorKey) });
      return;
    }
    return onSubmit(data);
  };

  return (
    <div
      className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0"
      data-testid="enter-password-to-unlock-key"
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <h2 id={titleId} className="w-full text-xl">{caption(captionKey.title)}</h2>
        {operation && (
          <p className="w-full font-semibold" data-testid="password-form-operation">
            {t(operation.key, operation.values)}
          </p>
        )}
        {captionKey.description && <p className="w-full">{caption(captionKey.description)}</p>}
        {showSessionTime && <SessionTimeNote className="w-full text-sm text-muted-foreground" />}

        <form method="post" className="mt-6 w-full">
          <div className="relative mb-5">
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-hidden focus:ring-red-500 dark:text-slate-300"
              placeholder={caption(captionKey.inputPasswordPlaceholder)}
              autoComplete={autoComplete}
              {...passwordField}
              onBlur={(event) => {
                passwordField.onBlur(event);
                if (keyAuthority) keyCheck.checkEnteredKey();
              }}
              data-testid="posting-private-key-input"
            />
            {errors.password?.message && (
              <p className="text-sm text-red-500" role="alert" data-testid="password-form-error-message">
                {errors.password.message}
              </p>
            )}
          </div>

          {showRememberKey && mode === PasswordFormMode.WIF && (
            <fieldset className="mb-5 flex flex-col gap-2 py-1">
              {REMEMBER_KEY_CHOICES.map(({ value, label, testId }) => (
                <div key={value} className="flex items-center">
                  <input
                    id={`remember-key-${value}-${randomValue}`}
                    type="checkbox"
                    className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-hidden"
                    checked={rememberKey === value}
                    onChange={(event) => setValue('rememberKey', event.target.checked ? value : '')}
                    data-testid={testId}
                  />
                  <label
                    htmlFor={`remember-key-${value}-${randomValue}`}
                    className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
                  >
                    {t(label)}
                  </label>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{t('password_form.remember_key_hint')}</p>
            </fieldset>
          )}

          {checkPasskey && (
            <button
              type="button"
              onClick={submitWithPasskey}
              disabled={isSubmitting || isCheckingPasskey}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold hover:cursor-pointer hover:border-red-500 focus:outline-hidden disabled:hover:cursor-not-allowed disabled:opacity-60 dark:text-slate-300"
              data-testid="password-form-passkey-button"
            >
              <Icons.keyRound className="h-4 w-4" aria-hidden />
              {t('password_form.use_passkey')}
            </button>
          )}

          <div className="mt-10 flex items-center justify-between">
            {/* Submit Button */}
            <button
              type="submit"
              className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-hidden disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
              onClick={handleSubmit(submitIfValid)}
              data-testid="password-submit-button"
              disabled={isSubmitting}
            >
              {!isSubmitting && caption(captionKey.submitButtonName)}
              {isSubmitting && caption(captionKey.submitButtonNameWhenWorking)}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-hidden"
              data-testid="password-cancel-button"
            >
              {caption(captionKey.cancelButtonName)}
            </button>
          </div>

          <div>
            <p className="text-sm text-red-500" role="alert">
              {errorMessage || '\u00A0'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
