import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'next-i18next';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export enum PasswordFormMode {
  HBAUTH = 'hbauth',
  WIF = 'wif',
}

// Hbauth password (de facto regular password)
const passwordHbauth = z.string()
  .min(1, 'Password must contain at least 1 character')
  .max(512, 'Password must contain at most 512 characters');

const passwordFormSchemaHbauth = z.object({
  password: passwordHbauth,
});
export type PasswordFormSchemaHbauth = z.infer<typeof passwordFormSchemaHbauth>;

export const passwordFormDefaultValuesHbauth = {
  password: '',
};

// Wif password

export const passwordWif = z.string()
  .superRefine((val, ctx) => {
    const result = validateWifKey(val, (v) => v);
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

const passwordFormSchemaWif = z.object({
  password: passwordWif,
  storePassword: z.boolean(),
});
export type PasswordFormSchemaWif = z.infer<typeof passwordFormSchemaWif>;

export const passwordFormDefaultValuesWif = {
  password: '',
  storePassword: false,
};

// captions for inputs, buttons, form title etc.
export interface PasswordFormI18nKeysForCaptions {
  title?: string | [string, {[key: string]: string}];
  description?: string | [string, {[key: string]: string}];
  inputPasswordPlaceholder?: string | [string, {[key: string]: string}];
  inputStorePasswordLabel?: string | [string, {[key: string]: string}];
  submitButtonName?: string | [string, {[key: string]: string}];
  submitButtonNameWhenWorking?: string | [string, {[key: string]: string}];
  resetButtonName?: string | [string, {[key: string]: string}];
}

export interface PasswordFormOptions {
  mode?: PasswordFormMode;
  showInputStorePassword?: boolean;
  errorMessage?: string;
  onSubmit?: (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => any;
  i18nKeysForCaptions?: PasswordFormI18nKeysForCaptions;
  i18nNamespace?: string;
}

export function PasswordForm({
  mode = PasswordFormMode.HBAUTH,
  showInputStorePassword = true,
  errorMessage = '',
  onSubmit = (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => {},
  i18nKeysForCaptions = {}, // captions for inputs, buttons, form title etc.
  i18nNamespace = 'smart-signer'
}: PasswordFormOptions) {
  const { t } = useTranslation(i18nNamespace);
  const randomValue = crypto.randomUUID()
  const t2 = (args: string | [string, {[key: string]: string}]) =>
    Array.isArray(args) ? t(...args) : t(args);

  const defaultI18nKeysForCaptions = {
    title: 'password_form.password_form_title',
    description: '',
    inputPasswordPlaceholder: 'password_form.password_placeholder',
    inputStorePasswordLabel: 'password_form.store_password_label',
    submitButtonName: 'login_form.login_button',
    submitButtonNameWhenWorking: 'login_form.working',
    resetButtonName: 'login_form.reset_button',
  };
  const captionKey: Required<PasswordFormI18nKeysForCaptions> =
    {...defaultI18nKeysForCaptions, ...i18nKeysForCaptions};

  let resolver;
  let passwordFormDefaultValues;
  if (mode === PasswordFormMode.HBAUTH) {
    resolver = passwordFormSchemaHbauth;
    passwordFormDefaultValues = passwordFormDefaultValuesHbauth
  } else if (mode === PasswordFormMode.WIF) {
    resolver = passwordFormSchemaWif;
    passwordFormDefaultValues = passwordFormDefaultValuesWif
  } else {
    throw new Error('Invalid mode');
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PasswordFormSchemaHbauth | PasswordFormSchemaWif>({
    resolver: zodResolver(resolver),
    defaultValues: passwordFormDefaultValues
  });

  return (
    <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">

        <h2 className="w-full text-xl">{t2(captionKey.title)}</h2>
        {captionKey.description && <p className="w-full">{t2(captionKey.description)}</p>}

        <form method="post" className="w-full mt-6">

          <div className="relative mb-5">
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500 dark:text-slate-300"
              placeholder={t2(captionKey.inputPasswordPlaceholder)}
              autoComplete="current-password"
              {...register('password')}
              data-testid="posting-private-key-input"
            />
            {errors.password?.message && (
              <p className="text-sm text-red-500" role="alert" data-testid="password-form-error-message">
                {
                  t(errors.password.message)
                }
              </p>
            )}
          </div>

          { showInputStorePassword && (
            <div className="flex items-center py-1 mb-5">
              <input
                id={`store-password-${randomValue}`}
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('storePassword')}
              />
              <label
                htmlFor={`store-password-${randomValue}`}
                className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                {t2(captionKey.inputStorePasswordLabel)}
              </label>
            </div>
          )}

          <div className="flex items-center justify-between mt-10">

            {/* Submit Button */}
            <button
              type="submit"
              className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
              onClick={handleSubmit(onSubmit)}
              data-testid="password-submit-button"
              disabled={isSubmitting}
            >
              {!isSubmitting && t2(captionKey.submitButtonName)}
              {isSubmitting && t2(captionKey.submitButtonNameWhenWorking)}
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => reset()}
              className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
              data-testid="password-reset-button"
            >
              {t2(captionKey.resetButtonName)}
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
