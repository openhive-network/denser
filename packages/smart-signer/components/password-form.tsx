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

export function PasswordForm({
  errorMessage = '',
  onSubmit = (data: PasswordFormSchema) => {},
  i18nNamespace = 'smart-signer'
}: {
  errorMessage: string;
  onSubmit: (data: PasswordFormSchema) => void;
  i18nNamespace?: string;
}) {
  const { t } = useTranslation(i18nNamespace);

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

        <h2 className="w-full pb-6 text-3xl text-gray-800 dark:text-slate-300" data-testid="password-header">
          {t('password_form.title_action_password')}
        </h2>

        <form method="post" className="w-full">

          <div className="relative mb-5">
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500 dark:text-slate-300"
              placeholder={t('password_form.password_placeholder')}
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
            <button
              type="submit"
              className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
              onClick={handleSubmit(onSubmit)}
              data-testid="password-submit-button"
              disabled={isSubmitting}
            >
              {!isSubmitting && t('password_form.password_button')}
              {isSubmitting && t('password_form.working')}
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
              data-testid="password-reset-button"
            >
              {t('password_form.reset_button')}
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
