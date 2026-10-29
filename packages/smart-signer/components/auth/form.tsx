/* Component that manages all available sign-in options */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import SafeStorage, { SafeStorageRef } from './methods/safestorage';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useProcessAuth, LoginFormSchema } from './process';
import { useLocalStorage } from 'usehooks-ts';
import Methods from './methods/methods';
import SafeStorageKeyUpdate from './methods/safestorage-key-update';
import { getLogger } from '@hive/ui/lib/logging';
import {
  abandonPendingSignIn,
  cancelPendingSignIn,
  runExclusiveSignIn,
  SignInPendingError
} from '@smart-signer/lib/auth/sign-in-lock';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { toast } from '@ui/components/hooks/use-toast';
import { ToastAction } from '@ui/components/toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';

const logger = getLogger('app');

/** Sign-in methods answered in a browser wallet extension */
const WALLET_EXTENSION_LOGIN_TYPES: ReadonlySet<LoginType> = new Set([
  LoginType.keychain,
  LoginType.peakvault,
  LoginType.metamask
]);
import Passkey from './methods/passkey';
import { configuredPasskeySigners } from '@ui/config/public-vars';

export interface SignInFormProps {
  preferredKeyTypes: KeyType[];
  onComplete: (arg0: any) => Promise<any>;
  authenticateOnBackend?: boolean;
  i18nNamespace?: string;
  /** The account to sign in; defaults to the last one signed in */
  username?: string;
  /** Opens on the "Passkey signer" sign-in instead of safe storage, when a signer is configured */
  passkey?: boolean;
}

export type SignInFormRef = { cancel: () => Promise<void> };

export enum Steps {
  SAFE_STORAGE_LOGIN = 1,
  SAFE_STORAGE_KEY_UPDATE,
  OTHER_LOGIN_OPTIONS,
  PASSKEY_LOGIN
}

const SignInForm = forwardRef<SignInFormRef, SignInFormProps>(
  (
    {
      preferredKeyTypes,
      onComplete,
      authenticateOnBackend = false,
      i18nNamespace = 'smart-signer',
      username: initialUsername,
      passkey = false
    }: SignInFormProps,
    ref
  ) => {
    // component controllers
    const passkeyStep = passkey && configuredPasskeySigners.length > 0;
    const [step, setStep] = useState<Steps>(passkeyStep ? Steps.PASSKEY_LOGIN : Steps.SAFE_STORAGE_LOGIN);
    const safeStorageRef = useRef<SafeStorageRef>(null);
    const [lastLoggedInUser, setLastLoggedInUser] = useLocalStorage<string>('lastLoggedInUser', '');
    const [username, setUsername] = useState<string>(initialUsername ?? lastLoggedInUser);
    const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE);

    // provide methods to outside from here
    useImperativeHandle(ref, () => ({
      // this may be called for clearing process
      // when cancel sign in flow
      async cancel() {
        // set cancelled state
        abandonPendingSignIn();
        await safeStorageRef.current?.cancel();
      }
    }));

    // Final form handlers.
    // TODO Some arguments for useProcessAuth should be read from env variables.
    // TODO: replace with function
    const { submitAuth, signAuth, isSigned } = useProcessAuth(authenticateOnBackend);

    async function sign(loginType: LoginType, username: string, keyType: KeyType): Promise<void> {
      const schema: LoginFormSchema = {
        loginType,
        username,
        keyType,
        remember: false // TODO: handle this if required
      };
      await signAuth(schema);
    }

    async function submit(username: string): Promise<void> {
      await submitAuth();
      setLastLoggedInUser(username);
      await onComplete(username);
    }

    function reportSignInPending(error: SignInPendingError): void {
      toast({
        description: t(error.translationKey),
        action: (
          <ToastAction altText={t('login_form.cancel_pending_sign_in')} onClick={cancelPendingSignIn}>
            {t('login_form.cancel_pending_sign_in')}
          </ToastAction>
        )
      });
    }

    async function signIn(loginType: LoginType, username: string, keyType: KeyType): Promise<void> {
      try {
        await runExclusiveSignIn(async () => {
          await sign(loginType, username, keyType);
          await submit(username);
        }, WALLET_EXTENSION_LOGIN_TYPES.has(loginType));
      } catch (error) {
        if (!(error instanceof SignInPendingError)) throw error;
        logger.info('Sign-in with %s not sent: another sign-in is in progress', loginType);
        reportSignInPending(error);
      }
    }

    return (
      <div className="flex max-h-[calc(100dvh-10rem)] overflow-y-auto pb-4">
        {step === Steps.SAFE_STORAGE_LOGIN && (
          <SafeStorage
            ref={safeStorageRef}
            preferredKeyTypes={preferredKeyTypes}
            onSetStep={setStep}
            signIn={signIn}
            i18nNamespace={i18nNamespace}
            isSigned={isSigned}
            username={username}
            onUsernameChange={(username) => setUsername(username)}
          />
        )}

        {step === Steps.OTHER_LOGIN_OPTIONS && (
          <Methods
            onSetStep={setStep}
            i18nNamespace={i18nNamespace}
            preferredKeyTypes={preferredKeyTypes}
            username={username}
            onUsernameChange={(username) => setUsername(username)}
            signIn={signIn}
          />
        )}

        {step === Steps.PASSKEY_LOGIN && (
          <Passkey
            onSetStep={setStep}
            i18nNamespace={i18nNamespace}
            username={username}
            onUsernameChange={(username) => setUsername(username)}
            signIn={signIn}
          />
        )}

        {step === Steps.SAFE_STORAGE_KEY_UPDATE && (
          <SafeStorageKeyUpdate
            onSetStep={setStep}
            i18nNamespace={i18nNamespace}
            preferredKeyTypes={preferredKeyTypes}
            username={username}
            onUsernameChange={(username) => setUsername(username)}
          />
        )}
      </div>
    );
  }
);

SignInForm.displayName = 'SignInForm';

export default SignInForm;
