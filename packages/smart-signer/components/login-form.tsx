/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'next-i18next';
import { Separator } from '@hive/ui/components/separator';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { username } from '@smart-signer/lib/auth/utils';
import { LoginType, StorageType } from '@smart-signer/types/common';
import { validateHivePassword } from '@smart-signer/lib/validators/validate-hive-password';
import { titleCase } from '@smart-signer/lib/utils';
import { Icons } from '@ui/components/icons';
import { toast } from '@ui/components/hooks/use-toast';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const ZodStorageTypeEnum = z.nativeEnum(StorageType);

const ZodLoginTypeEnum = z.nativeEnum(LoginType);
type ZodLoginTypeEnum = z.infer<typeof ZodLoginTypeEnum>;

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
  z.object({ loginType: z.literal(ZodLoginTypeEnum.enum.wif) }).merge(commonFieldsWithPassword),
  z.object({ loginType: z.literal(ZodLoginTypeEnum.enum.hbauth) }).merge(commonFields),
  z.object({ loginType: z.literal(ZodLoginTypeEnum.enum.hiveauth) }).merge(commonFields),
  z.object({ loginType: z.literal(ZodLoginTypeEnum.enum.keychain) }).merge(commonFields),
  z.object({ loginType: z.literal(ZodLoginTypeEnum.enum.hivesigner) }).merge(commonFields)
]);

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

const loginFormDefaultValues = {
  loginType: LoginType.hbauth,
  password: '',
  remember: false,
  useHbauth: true,
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
  const [disabledPasword, setDisabledPassword] = useState(true);

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

  const onCheckboxToggle = (e: React.ChangeEvent<HTMLInputElement>, loginType: LoginType) => {
    if (e.target.checked) {
      setValue(`use${titleCase(loginType)}` as any, true);
      setValue('loginType', LoginType[loginType]);
      for (const l of Object.keys(LoginType)) {
        if (l === loginType) continue;
        setValue(`use${titleCase(l)}` as any, false);
      }
      trigger('password');
      setDisabledPassword(true);
    } else {
      setValue('loginType', LoginType.wif);
      setDisabledPassword(false);
    }
  };

  const onHivesignerButtonClick = () => {
    toast({
      title: 'Info',
      description: 'Hivesigner support is not implemented',
      variant: 'destructive'
    });
  };

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
                id="useHbauth"
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('useHbauth')}
                onChange={(e) => onCheckboxToggle(e, LoginType.hbauth)}
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
                type="checkbox"
                id="useKeychain"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register('useKeychain')}
                disabled={!isKeychainSupported}
                onChange={(e) => onCheckboxToggle(e, LoginType.keychain)}
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
                onChange={(e) => onCheckboxToggle(e, LoginType.hiveauth)}
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
              className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
              onClick={handleSubmit(onSubmit)}
              data-testid="login-submit-button"
              disabled={isSubmitting}
            >
              {!isSubmitting && t('login_form.login_button')}
              {isSubmitting && t('login_form.working')}
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
              onClick={(e) => {
                e.preventDefault();
                onHivesignerButtonClick();
              }}
            >
              <img src="/smart-signer/images/hivesigner.svg" alt="Hivesigner logo" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
