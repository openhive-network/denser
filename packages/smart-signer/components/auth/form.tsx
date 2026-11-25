/* Component that manages all available sign-in options */
import { forwardRef, lazy, ReactNode, Suspense, useImperativeHandle, useRef, useState } from 'react';
import SafeStorage, { SafeStorageRef } from './methods/safestorage';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useProcessAuth, LoginFormSchema } from './process';
import { useLocalStorage } from 'usehooks-ts';
import type { SafeStorageKeyUpdateRef } from './methods/safestorage-key-update';
import { getLogger } from '@hive/ui/lib/logging';
import {
  cancelPendingSignIn,
  runExclusiveSignIn,
  SignInCancelledError,
  SignInPendingError
} from '@smart-signer/lib/auth/sign-in-lock';
import { getLastSafeStorageUser, recordSignInMethod } from '@smart-signer/lib/auth/last-safe-storage-user';
import { awaitWalletExtensionAnswer, WalletExtensionTimeoutError } from '@smart-signer/lib/auth/wallet-extension-answer';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { toast } from '@ui/components/hooks/use-toast';
import { ToastAction } from '@ui/components/toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';

const logger = getLogger('app');

/** Sign-in methods answered in a browser wallet extension, with the extension's name */
const WALLET_EXTENSION_NAMES: ReadonlyMap<LoginType, string> = new Map([
  [LoginType.keychain, 'Hive Keychain'],
  [LoginType.peakvault, 'PeakVault'],
  [LoginType.metamask, 'MetaMask']
]);
import { configuredPasskeySigners } from '@ui/config/public-vars';
import Step from './step';
import { SignInFormFrame } from './sign-in-form-shell';

// The first step is safe storage: the others, and the signers they offer, load when they are opened
const Methods = lazy(() => import('./methods/methods'));
const Passkey = lazy(() => import('./methods/passkey'));
const SafeStorageKeyUpdate = lazy(() => import('./methods/safestorage-key-update'));

export interface SignInFormProps {
  preferredKeyTypes: KeyType[];
  onComplete: (arg0: any) => Promise<any>;
  authenticateOnBackend?: boolean;
  i18nNamespace?: string;
  /** The account to sign in; defaults to the last one signed in with safe storage, on the passkey step any */
  username?: string;
  /** Opens on the "Passkey signer" sign-in instead of safe storage, when a signer is configured */
  passkey?: boolean;
  /** Shown in place of the safe storage step until it is ready; a spinner when omitted */
  placeholder?: ReactNode;
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
      passkey = false,
      placeholder
    }: SignInFormProps,
    ref
  ) => {
    // component controllers
    const passkeyStep = passkey && configuredPasskeySigners.length > 0;
    const [step, setStep] = useState<Steps>(passkeyStep ? Steps.PASSKEY_LOGIN : Steps.SAFE_STORAGE_LOGIN);
    const safeStorageRef = useRef<SafeStorageRef>(null);
    const safeStorageKeyUpdateRef = useRef<SafeStorageKeyUpdateRef>(null);
    const [lastLoggedInUser, setLastLoggedInUser] = useLocalStorage<string>('lastLoggedInUser', '');
    // Not an account that last signed in with another method, as one logged out of to switch accounts
    const [username, setUsername] = useState<string>(
      () => initialUsername ?? (passkeyStep ? lastLoggedInUser : getLastSafeStorageUser())
    );
    const [safeStorageError, setSafeStorageError] = useState<string | null>(null);
    // The passkey is asked when the sign-in opens, not each time the user comes back to its first step
    const [leftSafeStorage, setLeftSafeStorage] = useState(false);
    const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE);

    // provide methods to outside from here
    useImperativeHandle(ref, () => ({
      // this may be called for clearing process
      // when cancel sign in flow
      async cancel() {
        // A closed dialog no longer waits for its sign-in, so the next one must not be refused
        cancelPendingSignIn();
        // Both refs are read before awaiting: the closed dialog unmounts the steps meanwhile
        await Promise.all([safeStorageRef.current?.cancel(), safeStorageKeyUpdateRef.current?.cancel()]);
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

    async function submit(loginType: LoginType, username: string): Promise<void> {
      await submitAuth();
      setLastLoggedInUser(username);
      recordSignInMethod(username, loginType);
      await onComplete(username);
    }

    function reportSignInPending(error: SignInPendingError): void {
      toast({
        description: t(error.translationKey),
        // Stays until the user cancels the pending sign-in or dismisses the toast
        duration: Infinity,
        action: (
          <ToastAction altText={t('login_form.cancel_pending_sign_in')} onClick={cancelPendingSignIn}>
            {t('login_form.cancel_pending_sign_in')}
          </ToastAction>
        )
      });
    }

    function reportWalletExtensionTimeout(walletName: string): void {
      toast({
        description: t('login_form.wallet_extension_no_answer', { wallet: walletName }),
        variant: 'destructive'
      });
    }

    /**
     * Resolves with false when the sign-in was not sent because another one is pending,
     * when the wallet extension did not answer it in time, or when it was cancelled meanwhile
     */
    async function signIn(loginType: LoginType, username: string, keyType: KeyType): Promise<boolean> {
      const walletName = WALLET_EXTENSION_NAMES.get(loginType);
      try {
        await runExclusiveSignIn(async (cancelled) => {
          const signing = sign(loginType, username, keyType);
          await (walletName ? awaitWalletExtensionAnswer(signing) : signing);
          // The dialog that started this sign-in was closed: another may have completed meanwhile
          cancelled.throwIfAborted();
          await submit(loginType, username);
        }, walletName !== undefined);
        return true;
      } catch (error) {
        if (error instanceof SignInPendingError) {
          logger.info('Sign-in with %s not sent: another sign-in is in progress', loginType);
          reportSignInPending(error);
          return false;
        }
        if (error instanceof SignInCancelledError) {
          logger.info('Sign-in with %s dropped: it was cancelled before it ended', loginType);
          return false;
        }
        if (walletName && error instanceof WalletExtensionTimeoutError) {
          logger.warn('Sign-in with %s dropped: the wallet extension did not answer', loginType);
          reportWalletExtensionTimeout(walletName);
          return false;
        }
        throw error;
      }
    }

    function goToStep(nextStep: Steps): void {
      if (step === Steps.SAFE_STORAGE_LOGIN) setLeftSafeStorage(true);
      setStep(nextStep);
    }

    function returnToSafeStorageLogin(error: string): void {
      setSafeStorageError(error);
      goToStep(Steps.SAFE_STORAGE_LOGIN);
    }

    function changeStep(nextStep: Steps): void {
      setSafeStorageError(null);
      goToStep(nextStep);
    }

    return (
      <SignInFormFrame>
        {step === Steps.SAFE_STORAGE_LOGIN && (
          <SafeStorage
            ref={safeStorageRef}
            preferredKeyTypes={preferredKeyTypes}
            onSetStep={changeStep}
            signIn={signIn}
            i18nNamespace={i18nNamespace}
            isSigned={isSigned}
            username={username}
            onUsernameChange={(username) => setUsername(username)}
            initialError={safeStorageError}
            placeholder={placeholder}
            askPasskeyOnOpen={!leftSafeStorage}
          />
        )}

        <Suspense fallback={<Step loading={true} />}>
          {step === Steps.OTHER_LOGIN_OPTIONS && (
            <Methods
              onSetStep={changeStep}
              i18nNamespace={i18nNamespace}
              preferredKeyTypes={preferredKeyTypes}
              username={username}
              onUsernameChange={(username) => setUsername(username)}
              signIn={signIn}
            />
          )}

          {step === Steps.PASSKEY_LOGIN && (
            <Passkey
              onSetStep={changeStep}
              i18nNamespace={i18nNamespace}
              username={username}
              onUsernameChange={(username) => setUsername(username)}
              signIn={signIn}
            />
          )}

          {step === Steps.SAFE_STORAGE_KEY_UPDATE && (
            <SafeStorageKeyUpdate
              ref={safeStorageKeyUpdateRef}
              onSetStep={changeStep}
              i18nNamespace={i18nNamespace}
              preferredKeyTypes={preferredKeyTypes}
              username={username}
              onUsernameChange={(username) => setUsername(username)}
              signIn={signIn}
              onSignInFailed={returnToSafeStorageLogin}
            />
          )}
        </Suspense>
      </SignInFormFrame>
    );
  }
);

SignInForm.displayName = 'SignInForm';

export default SignInForm;
