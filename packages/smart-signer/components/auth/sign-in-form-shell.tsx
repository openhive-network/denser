/* The first view of the sign-in form, without its behaviour, for the server to render */
import type { FC, ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Icons } from '@ui/components/icons';
import { configuredSessionTime } from '@ui/config/public-vars';
import { KeyType } from '@smart-signer/types/common';
import { formatSessionTime, sessionTimeCaption } from '@smart-signer/lib/session-time-text';

/** The frame `SignInForm` lays its steps out in */
export const SignInFormFrame: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex max-h-[calc(100dvh-10rem)] overflow-y-auto pb-4">{children}</div>
);

export interface SignInFormShellProps {
  /** The app's translations of the smart-signer namespace */
  t: TFunction;
  /** The language the page renders in */
  locale: string;
}

const InfoIcon: FC = () => (
  <span className="text-muted-foreground shrink-0 rounded-full p-2" aria-hidden="true">
    <Icons.info className="h-4 w-4" />
  </span>
);

const SecretInput: FC<{ placeholder: string }> = ({ placeholder }) => (
  <div className="space-y-2">
    <div className="relative">
      <Input placeholder={placeholder} type="password" readOnly tabIndex={-1} />
      <Button
        variant="ghost"
        className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-1 hover:bg-transparent"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Icons.eye />
      </Button>
    </div>
  </div>
);

/**
 * What the safe storage step of `SignInForm` first shows a visitor with no stored account, laid out as
 * it lays it out, but inert: the page shows it until the form's code has loaded and the form is ready,
 * so the form's text is painted from the server's HTML. Outside the form, render it in a `SignInFormFrame`.
 * Keep it in step with `methods/safestorage.tsx`.
 */
const SignInFormShell: FC<SignInFormShellProps> = ({ t, locale }) => {
  const keyType = KeyType.posting;
  const duration = formatSessionTime(t, configuredSessionTime.deployment);

  return (
    <Card
      className="dark:bg-background/95 w-full border-none bg-transparent shadow-none dark:text-white"
      aria-busy="true"
      data-testid="sign-in-form-shell"
    >
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-1">
            {t('login_form.signin_safe_storage.title')}
            <InfoIcon />
          </span>
        </CardTitle>
        <CardDescription>
          <div>
            <div>{t('login_form.signin_safe_storage.description_save', { keyType })}</div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative flex">
              <Input
                placeholder={t('login_form.signin_safe_storage.placeholder_username')}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>
          <SecretInput placeholder={t('login_form.signin_safe_storage.placeholder_password')} />
          <SecretInput placeholder={t('login_form.signin_safe_storage.placeholder_wif', { keyType })} />
          <div className="flex items-center space-x-2">
            <span className="border-primary peer h-4 w-4 shrink-0 rounded-sm border" />
            <span className="text-sm leading-none">
              {t('login_form.signin_safe_storage.strict_mode')}{' '}
              <span className="text-muted-foreground text-xs">
                {t('login_form.signin_safe_storage.strict_mode_scope')}
              </span>
            </span>
            <InfoIcon />
          </div>
          <div className="flex items-start space-x-2">
            <span className="border-primary peer h-4 w-4 shrink-0 rounded-sm border" />
            <div className="space-y-1">
              <span className="text-sm leading-none">{t('login_form.signin_safe_storage.active_check')}</span>
              <p className="text-muted-foreground text-xs">{t('login_form.signin_safe_storage.active_check_hint')}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-normal leading-none">{t('session_time.choose_label')}</span>
              <span className="border-input bg-background flex h-8 w-28 items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="line-clamp-1">{duration}</span>
                <Icons.chevronDown className="h-4 w-4 opacity-50" />
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {sessionTimeCaption(t, configuredSessionTime.deployment, locale, false)}
            </p>
          </div>
          <div className="flex select-none">
            <Button className="w-full flex-1 bg-red-600 text-white hover:bg-red-500" disabled>
              {t('login_form.signin_safe_storage.button_save')}
            </Button>
          </div>
          <div className="bg-border my-4 h-px w-full shrink-0" />
          <Button className="w-full" variant="secondary" tabIndex={-1}>
            <Icons.keyRound className="mr-2 h-4 w-4" />
            {t('login_form.other_signin_options')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignInFormShell;
