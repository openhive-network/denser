/* Component that manages all available sign-in options */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { KeyAuthorityType } from '@hive/hb-auth';
import SafeStorage, { SafeStorageRef } from './methods/safestorage';
import { Button } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import Step from './step';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useProcessAuth, LoginFormSchema } from './process';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import Methods from './methods/methods';

export interface SignInFormProps {
    preferredKeyTypes: KeyAuthorityType[]; // This option is set only for safe storage (hb-auth)
    onComplete: () => void;
    i18nNamespace?: string;
}

export type SignInFormRef = { cancel: () => Promise<void>; };

export enum Steps {
    SAFE_STORAGE_LOGIN = 1,
    OTHER_LOGIN_OPTIONS,
    OTHER_LOGIN_DETAILS
}

const SignInForm = forwardRef<SignInFormRef, SignInFormProps>(({ preferredKeyTypes, onComplete, i18nNamespace = 'smart-signer' }, ref) => {
    // component controllers
    const [step, setStep] = useState<Steps>(Steps.SAFE_STORAGE_LOGIN);
    const { t } = useTranslation(i18nNamespace);
    const safeStorageRef = useRef<SafeStorageRef>(null);
    const [lastLoggedInUser, setLastLoggedInUser] = useLocalStorage<string>('lastLoggedInUser', '');

    // provide methods to outside from here
    useImperativeHandle(ref, () => ({
        // this may be called for clearing process
        // when cancel sign in flow
        async cancel() {
            // set cancelled state
            await safeStorageRef.current?.cancel();
        }
    }));

    // final form handlers
    // TODO: replace with function
    const { submitAuth, signAuth, isSigned } = useProcessAuth(t);

    async function sign(loginType: LoginType, username: string, keyType: KeyType): Promise<void> {
        const schema: LoginFormSchema = {
            loginType,
            username,
            keyType,
            remember: false // TODO: handle this if required
        }
        await signAuth(schema);
    }

    async function submit(username: string): Promise<void> {
        await submitAuth();
        setLastLoggedInUser(username);
        onComplete();
    }


    return <div className="flex max-h-[400px] h-min pb-4">

        {
            step === Steps.SAFE_STORAGE_LOGIN && (
                <SafeStorage
                    ref={safeStorageRef}
                    preferredKeyTypes={preferredKeyTypes}
                    onSetStep={setStep}
                    sign={sign}
                    submit={submit}
                    i18nNamespace={i18nNamespace}
                    isSigned={isSigned}
                    lastLoggedInUser={lastLoggedInUser}
                />
            )
        }

        {
            // TODO: Extract this to separate component 
            (step === Steps.OTHER_LOGIN_OPTIONS &&
                <Methods onSetStep={setStep} i18nNamespace={i18nNamespace} />
            )
        }
    </div>
})

SignInForm.displayName = 'SignInForm';

export default SignInForm;