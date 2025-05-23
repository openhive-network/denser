/* Component that manages all available sign-in options */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import SafeStorage, { SafeStorageRef } from './methods/safestorage';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useProcessAuth, LoginFormSchema } from './process';
import { useLocalStorage } from 'usehooks-ts';
import Methods from './methods/methods';
import SafeStorageKeyUpdate from './methods/safestorage-key-update';

export interface SignInFormProps {
  preferredKeyTypes: KeyType[];
  onComplete: (arg0: any) => Promise<any>;
  authenticateOnBackend?: boolean,
  strict?: boolean; // if true use strict authentication
  i18nNamespace?: string;
}

export type SignInFormRef = { cancel: () => Promise<void> };

export enum Steps {
  SAFE_STORAGE_LOGIN = 1,
  SAFE_STORAGE_KEY_UPDATE,
  OTHER_LOGIN_OPTIONS,
}

const SignInForm = forwardRef<SignInFormRef, SignInFormProps>(
  ({ preferredKeyTypes, onComplete, authenticateOnBackend = false, strict = false, i18nNamespace = 'smart-signer' }: SignInFormProps, ref) => {
    // component controllers
    const [step, setStep] = useState<Steps>(Steps.SAFE_STORAGE_LOGIN);
    const { t } = useTranslation(i18nNamespace);
    const safeStorageRef = useRef<SafeStorageRef>(null);
    const [lastLoggedInUser, setLastLoggedInUser] = useLocalStorage<string>('lastLoggedInUser', '');
    const [username, setUsername] = useState<string>(lastLoggedInUser);

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
    const { submitAuth, signAuth, isSigned } = useProcessAuth(t, authenticateOnBackend, strict);

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

    return (
      <div className="flex h-min max-h-[500px] pb-4">
        {step === Steps.SAFE_STORAGE_LOGIN && (
          <SafeStorage
            ref={safeStorageRef}
            preferredKeyTypes={preferredKeyTypes}
            onSetStep={setStep}
            sign={sign}
            submit={submit}
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
            sign={sign}
            submit={submit}
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
