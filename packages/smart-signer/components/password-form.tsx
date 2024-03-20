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

export interface PasswordFormCaptions {
  title?: string;
  description?: string;
  inputPasswordPlaceholder?: string;
  submitButtonName?: string;
  submitButtonNameWhenWorking?: string;
  resetButtonName?: string;
}

export function PasswordForm({
  errorMessage = '',
  onSubmit = (data: PasswordFormSchema) => {},
  formCaptions = {}, // captions for inputs, buttons, form title etc.
  i18nNamespace = 'smart-signer'
}: {
  errorMessage: string;
  onSubmit: (data: PasswordFormSchema) => void;
  formCaptions?: PasswordFormCaptions;
  i18nNamespace?: string;
}) {
  const { t } = useTranslation(i18nNamespace);

  const defaultCaptions = {
    title: t('password_form.password_form_title'),
    description: '',
    inputPasswordPlaceholder: t('password_form.password_placeholder'),
    submitButtonName: t('login_form.login_button'),
    submitButtonNameWhenWorking: t('login_form.working'),
    resetButtonName: t('login_form.reset_button'),
  };
  const captions = {...defaultCaptions, formCaptions};

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

        <h2 className="w-full text-xl">{captions.title}</h2>
        {captions.description && <p className="w-full">{captions.description}</p>}

        <form method="post" className="w-full mt-6">

          <div className="relative mb-5">
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500 dark:text-slate-300"
              placeholder={captions.inputPasswordPlaceholder}
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
              {!isSubmitting && captions.submitButtonName}
              {isSubmitting && captions.submitButtonNameWhenWorking}
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => reset()}
              className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
              data-testid="password-reset-button"
            >
              {captions.resetButtonName}
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
