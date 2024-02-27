/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'next-i18next';
import { Separator } from '@hive/ui/components/separator';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { username } from '@smart-signer/lib/auth/utils';
import { LoginTypes, StorageTypes } from '@smart-signer/types/common';
import { Icons } from '@ui/components/icons';
import { toast } from '@ui/components/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@ui/components/radio-group';
import { titleCase } from '@smart-signer/lib/utils';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const loginFormSchema = z.object({
  username,
  loginType: z.nativeEnum(LoginTypes),
  remember: z.boolean(),
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

const loginFormDefaultValues = {
  username: '',
  loginType: LoginTypes.hbauth,
  remember: false,
};

export const loginTypes = {
  hbauth: {
    logo: "/smart-signer/images/hive-blog-twshare.png",
    type: "internal",
  },
  hiveauth: {
    logo: "/smart-signer/images/hiveauth.png",
    type: "internal",
  },
  hivesigner: {
    logo: "/smart-signer/images/hivesigner.svg",
    type: "external",
  },
  keychain: {
    logo: "/smart-signer/images/hivekeychain.png",
    type: "internal",
  },
  wif: {
    logo: "/smart-signer/images/hive-blog-twshare.png",
    type: "internal",
  },
};

export type LoginType = keyof typeof loginTypes;

export interface LoginFormOptions {
  errorMessage: string;
  onSubmit: (data: LoginFormSchema) => void;
  allowLoginTypes?: LoginTypes[];
  i18nNamespace?: string;
}

export function LoginForm({
  errorMessage = '',
  onSubmit = (data: LoginFormSchema) => {},
  allowLoginTypes = Object.keys(LoginTypes) as LoginTypes[],
  i18nNamespace = 'smart-signer'
}: LoginFormOptions) {
  const { t } = useTranslation(i18nNamespace);
  const [isKeychainSupported, setIsKeychainSupported] = useState(false);

  useEffect(() => {
    setIsKeychainSupported(hasCompatibleKeychain());
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset
  } = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: loginFormDefaultValues
  });

  const onHivesignerButtonClick = () => {
    toast({
      title: 'Info',
      description: 'Hivesigner support is not implemented',
      variant: 'destructive'
    });
  };

  const radioGroupItem = (loginType: LoginTypes, disabled: boolean = false) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <RadioGroupItem
          value={loginType}
          className="border-2 border-gray-600 focus:ring-transparent"
          id={`radio-${loginType}`}
          disabled={disabled}
        />
        <label
          className="ml-2 flex items-center text-sm font-medium text-gray-900 dark:text-slate-300"
          htmlFor={`radio-${loginType}`}
        >
          <img
            className="mr-1 h-4 w-4"
            src={loginTypes[loginType].logo}
            alt={`${titleCase(loginType)} Logo`}
          />
          {t(`login_form.use_${loginType}`)}
        </label>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">

        <h2 className="w-full pb-6 text-3xl text-gray-800 dark:text-slate-300" data-testid="login-header">
          {t('login_form.title_action_login')}
        </h2>

        <form method="post" className="w-full">

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

          <div className="my-6 flex w-full flex-col">

            <RadioGroup
              defaultValue={loginFormDefaultValues.loginType}
              onValueChange={(v) => {
                setValue('loginType', v as LoginTypes);
              }}
              aria-label="Login Type"
            >

              {allowLoginTypes.includes(LoginTypes.hbauth)
                && radioGroupItem(LoginTypes.hbauth)}

              {allowLoginTypes.includes(LoginTypes.keychain)
                && radioGroupItem(LoginTypes.keychain, !isKeychainSupported)}

              {allowLoginTypes.includes(LoginTypes.hiveauth)
                && radioGroupItem(LoginTypes.hiveauth)}

              {allowLoginTypes.includes(LoginTypes.wif)
                && radioGroupItem(LoginTypes.wif)}

            </RadioGroup>

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

          {allowLoginTypes.includes(LoginTypes.hiveauth) && (
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
          )}

          {allowLoginTypes.includes(LoginTypes.hivesigner) && (
            <div className="mt-4 flex w-full items-center">
              <Separator orientation="horizontal" className="w-1/3" />
              <span className="w-1/3 text-center text-sm">{t('login_form.more_login_methods')}</span>
              <Separator orientation="horizontal" className="w-1/3" />
            </div>
          )}

          {allowLoginTypes.includes(LoginTypes.hivesigner) && (
            <div className="flex justify-center">
              <button
                className="mt-4 flex w-fit justify-center rounded-lg bg-gray-400 px-5 py-2.5 hover:bg-gray-500 focus:outline-none "
                data-testid="hivesigner-button"
                onClick={(e) => {
                  e.preventDefault();
                  onHivesignerButtonClick();
                }}
              >
                <img
                  src={loginTypes[LoginTypes.hivesigner].logo}
                  alt="Hivesigner logo"
                />
              </button>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
