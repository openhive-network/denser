/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'next-i18next';
import { Separator } from '@hive/ui/components/separator';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer-keychain';
import { username } from '@smart-signer/lib/auth/utils';
import { LoginTypes, StorageTypes } from '@smart-signer/types/common';
import { validateHivePassword } from '@smart-signer/lib/validate-hive-password';
import { Icons } from '@ui/components/icons';
import { toast } from '@ui/components/hooks/use-toast';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

const ZodStorageTypesEnum = z.nativeEnum(StorageTypes);

const ZodLoginTypesEnum = z.nativeEnum(LoginTypes);
type ZodLoginTypesEnum = z.infer<typeof ZodLoginTypesEnum>;

const passwordField = z.object({
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

const commonFields = z.object({
  username,
  useHbauth: z.boolean(),
  useKeychain: z.boolean(),
  useHiveauth: z.boolean(),
  remember: z.boolean()
});

const commonFieldsWithPassword = commonFields.merge(passwordField);

const loginFormSchema = z.discriminatedUnion('loginType', [
  z.object({ loginType: z.literal(ZodLoginTypesEnum.enum.wif) }).merge(commonFieldsWithPassword),
  z.object({ loginType: z.literal(ZodLoginTypesEnum.enum.hbauth) }).merge(commonFields),
  z.object({ loginType: z.literal(ZodLoginTypesEnum.enum.hiveauth) }).merge(commonFields),
  z.object({ loginType: z.literal(ZodLoginTypesEnum.enum.keychain) }).merge(commonFields),
  z.object({ loginType: z.literal(ZodLoginTypesEnum.enum.hivesigner) }).merge(commonFields)
]);

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

const loginFormDefaultValues = {
  loginType: LoginTypes.wif,
  password: '',
  remember: false,
  useHbauth: false,
  useHiveauth: false,
  useKeychain: false,
  username: ''
};

export function LoginForm({
  errorMessage = '',
  onSubmit = (data: LoginFormSchema) => {},
  i18nNamespace = 'smart-signer'
}: {
  errorMessage: string;
  onSubmit: (data: LoginFormSchema) => void;
  i18nNamespace?: string;
}) {

  const { t } = useTranslation(i18nNamespace);
  const [isKeychainSupported, setIsKeychainSupported] = useState(false);
  const [disabledPasword, setDisabledPassword] = useState(false);

  useEffect(() => {
    setIsKeychainSupported(hasCompatibleKeychain());
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    getValues,
    trigger,
    reset
  } = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: loginFormDefaultValues
  });

  const onKeychainToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setValue('useKeychain', true);
      setValue('loginType', LoginTypes.keychain);
      if (getValues('useHiveauth')) {
        setValue('useHiveauth', false);
      }
      if (getValues('useHbauth')) {
        setValue('useHbauth', false);
      }
      trigger('password');
      setDisabledPassword(true);
    } else {
      setValue('useKeychain', false);
      setValue('loginType', LoginTypes.wif);
      setDisabledPassword(false);
    }
  };

  const onHiveauthToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setValue('useHiveauth', true);
      setValue('loginType', LoginTypes.hiveauth);
      if (getValues('useKeychain')) {
        setValue('useKeychain', false);
      }
      if (getValues('useHbauth')) {
        setValue('useHbauth', false);
      }
      trigger('password');
      setDisabledPassword(true);
    } else {
      setValue('useHiveauth', false);
      setValue('loginType', LoginTypes.wif);
      setDisabledPassword(false);
    }
  };

  const onHbauthToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setValue('useHbauth', true);
      setValue('loginType', LoginTypes.hbauth);
      if (getValues('useHiveauth')) {
        setValue('useHiveauth', false);
      }
      if (getValues('useKeychain')) {
        setValue('useKeychain', false);
      }
      trigger('password');
      setDisabledPassword(true);
    } else {
      setValue('useHbauth', false);
      setValue('loginType', LoginTypes.wif);
      setDisabledPassword(false);
    }
  };

  const onHivesignerButtonClick = () => {
    toast({
      title: 'Info',
      description: 'Hivesigner support is not implemented',
      variant: 'destructive',
    });
  }

  return (
    <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <h2 className="w-full pb-6 text-3xl text-gray-800 dark:text-slate-300" data-testid="login-header">
          {t('login_form.title_action_login')}
        </h2>
        <form method="post" className="w-full">
          <input type="hidden" {...register('loginType')} />
          <div className="mb-5">
            <div className="relative">
              <input
                type="text"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 pl-11 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500 dark:text-slate-300"
                placeholder={t('login_form.username_placeholder')}
                autoComplete="username"
                {...register('username')}
                aria-invalid={errors.username ? 'true' : 'false'}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icons.atSign className="h-5 w-5" />
              </div>
            </div>
            {errors.username?.message && (
              <p className="text-sm text-red-500" role="alert">
                {t(errors.username.message)}
              </p>
            )}
          </div>

          <div className="relative mb-5">
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500 dark:text-slate-300"
              placeholder={t('login_form.password_placeholder')}
              autoComplete="current-password"
              disabled={disabledPasword}
              {...register('password')}
              data-testid="posting-private-key-input"
            />
            {/* @ts-ignore */}
            {errors.password?.message && (
              <p className="text-sm text-red-500" role="alert">
                {
                  /* @ts-ignore */
                  t(errors.password.message)
                }
              </p>
            )}
          </div>

          <div className="my-6 flex w-full flex-col">
            <div className="flex items-center py-1">
              <input
                type="checkbox"
                id="useKeychain"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('useKeychain')}
                disabled={!isKeychainSupported}
                onChange={(e) => onKeychainToggle(e)}
              />
              <label
                htmlFor="useKeychain"
                className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                <img
                  className="mr-1 h-4 w-4"
                  src="/smart-signer/images/hivekeychain.png"
                  alt="Hive Keychain logo"
                />
                {t('login_form.use_keychain')}
              </label>
            </div>

            <div className="flex items-center py-1">
              <input
                id="useHiveauth"
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('useHiveauth')}
                onChange={(e) => onHiveauthToggle(e)}
              />
              <label
                htmlFor="useHiveauth"
                className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                <img className="mr-1 h-4 w-4" src="/smart-signer/images/hiveauth.png" alt="Hiveauth logo" />
                {t('login_form.use_hiveauth')}
              </label>
            </div>

            <div className="flex items-center py-1">
              <input
                id="useHbauth"
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('useHbauth')}
                onChange={(e) => onHbauthToggle(e)}
              />
              <label
                htmlFor="useHbauth"
                className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                <img
                  className="mr-1 h-4 w-4"
                  src="/smart-signer/images/hive-blog-twshare.png"
                  alt="Hbauth logo"
                />
                {t('login_form.use_hbauth')}
              </label>
            </div>
            <div className="flex items-center py-1">
              <input
                id="remember"
                type="checkbox"
                value=""
                className=" h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('remember')}
              />
              <label
                htmlFor="remember"
                className="ml-2 text-sm font-medium text-gray-900 dark:text-slate-300"
              >
                {t('login_form.keep_me_logged_in')}
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-[6rem] rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none  disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
              onClick={handleSubmit(onSubmit)}
              data-testid="login-submit-button"
              disabled={isSubmitting}
            >
              {!isSubmitting && t('login_form.login_button')}
              {isSubmitting && (
                <svg aria-hidden="true" role="status" className="inline w-4 h-4 me-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
              data-testid="login-reset-button"
            >
              {t('login_form.reset_button')}
            </button>
          </div>

          <div>
            <p className="text-sm text-red-500" role="alert">
              {errorMessage || '\u00A0'}
            </p>
          </div>

          <div className="hiveauth-info">
            <div id="hiveauth-instructions" className="hiveauth-instructions hidden" />
            <a
              href="#"
              id="hiveauth-qr-link"
              className="hiveauth-qr keychainify-checked hidden"
              target="_blank"
              rel="noreferrer noopener"
            >
              <canvas id="hiveauth-qr" />
            </a>
          </div>

          <div className="mt-4 flex w-full items-center">
            <Separator orientation="horizontal" className="w-1/3" />
            <span className="w-1/3 text-center text-sm">{t('login_form.more_login_methods')}</span>
            <Separator orientation="horizontal" className="w-1/3" />
          </div>
          <div className="flex justify-center">
            <button
              className="mt-4 flex w-fit justify-center rounded-lg bg-gray-400 px-5 py-2.5 hover:bg-gray-500 focus:outline-none "
              data-testid="hivesigner-button"
              onClick={(e) => { e.preventDefault(); onHivesignerButtonClick() }}
            >
              <img src="/smart-signer/images/hivesigner.svg" alt="Hivesigner logo" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
