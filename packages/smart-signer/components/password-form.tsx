import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'next-i18next';
import { validateHivePassword } from '@smart-signer/lib/validators/validate-hive-password';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const passwordFormSchema = z.object({
  password: z.string().superRefine((val, ctx) => {
    const result = validateHivePassword(val, (v) => v);
    if (result) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result,
        fatal: true
      });
      return z.NEVER;
    }
    return true;
  })
});

export type PasswordFormSchema = z.infer<typeof passwordFormSchema>;

const passwordFormDefaultValues = {
  password: '',
};

// captions for inputs, buttons, form title etc.
export interface PasswordFormI18nKeysForCaptions {
  title?: string | [string, {[key: string]: string}];
  description?: string | [string, {[key: string]: string}];
  inputPasswordPlaceholder?: string | [string, {[key: string]: string}];
  submitButtonName?: string | [string, {[key: string]: string}];
  submitButtonNameWhenWorking?: string | [string, {[key: string]: string}];
  resetButtonName?: string | [string, {[key: string]: string}];
}

export function PasswordForm({
  errorMessage = '',
  onSubmit = (data: PasswordFormSchema) => {},
  i18nKeysForCaptions = {}, // captions for inputs, buttons, form title etc.
  i18nNamespace = 'smart-signer'
}: {
  errorMessage: string;
  onSubmit: (data: PasswordFormSchema) => void;
  i18nKeysForCaptions?: PasswordFormI18nKeysForCaptions;
  i18nNamespace?: string;
}) {
  const { t } = useTranslation(i18nNamespace);
  const t2 = (args: string | [string, {[key: string]: string}]) =>
    Array.isArray(args) ? t(...args) : t(args);

  const defaultI18nKeysForCaptions = {
    title: 'password_form.password_form_title',
    description: '',
    inputPasswordPlaceholder: 'password_form.password_placeholder',
    submitButtonName: 'login_form.login_button',
    submitButtonNameWhenWorking: 'login_form.working',
    resetButtonName: 'login_form.reset_button',
  };
  const captionKey: Required<PasswordFormI18nKeysForCaptions> =
    {...defaultI18nKeysForCaptions, ...i18nKeysForCaptions};

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PasswordFormSchema>({
    resolver: zodResolver(passwordFormSchema),
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
              <p className="text-sm text-red-500" role="alert">
                {
                  t(errors.password.message)
                }
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">

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
