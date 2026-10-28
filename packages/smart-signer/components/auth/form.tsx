/* Component that manages all available sign-in options */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import SafeStorage, { SafeStorageRef } from './methods/safestorage';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useProcessAuth, LoginFormSchema } from './process';
import { useLocalStorage } from 'usehooks-ts';
import Methods from './methods/methods';
import SafeStorageKeyUpdate from './methods/safestorage-key-update';
import Passkey from './methods/passkey';

export interface SignInFormProps {
  preferredKeyTypes: KeyType[];
  onComplete: (arg0: any) => Promise<any>;
  authenticateOnBackend?: boolean;
  strict?: boolean; // if true use strict authentication
  i18nNamespace?: string;
  /** The account to sign in; defaults to the last one signed in */
  username?: string;
  /** Opens on the "Passkey signer" sign-in instead of safe storage */
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
      strict = false,
      i18nNamespace = 'smart-signer',
      username: initialUsername,
      passkey = false
    }: SignInFormProps,
    ref
  ) => {
    // component controllers
    const [step, setStep] = useState<Steps>(passkey ? Steps.PASSKEY_LOGIN : Steps.SAFE_STORAGE_LOGIN);
    const safeStorageRef = useRef<SafeStorageRef>(null);
    const [lastLoggedInUser, setLastLoggedInUser] = useLocalStorage<string>('lastLoggedInUser', '');
    const [username, setUsername] = useState<string>(initialUsername ?? lastLoggedInUser);

    // provide methods to outside from here
    useImperativeHandle(ref, () => ({
      // this may be called for clearing process
      // when cancel sign in flow
      async cancel() {
        // set cancelled state
        await safeStorageRef.current?.cancel();
      }
    }));

    // Final form handlers.
    // TODO Some arguments for useProcessAuth should be read from env variables.
    // TODO: replace with function
    const { submitAuth, signAuth, isSigned } = useProcessAuth(authenticateOnBackend, strict);

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

    async function signIn(loginType: LoginType, username: string, keyType: KeyType): Promise<void> {
      await sign(loginType, username, keyType);
      await submit(username);
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
