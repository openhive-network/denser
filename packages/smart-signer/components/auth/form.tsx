/* Component that manages all available sign-in options */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { KeyAuthorityType } from '@hive/hb-auth';
import SafeStorage from './methods/safestorage';
import { Button } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import Step from './step';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useProcessAuth } from './process';
import { LoginFormSchema } from '../signin-form';

export interface SignInFormProps {
    preferredKeyTypes: KeyAuthorityType[]; // This option is set only for safe storage (hb-auth)
    onComplete: () => void;
    i18nNamespace?: string;
}

export type SignInFormRef = { cancel: () => void; };

export enum Steps {
    SAFE_STORAGE_LOGIN = 1,
    OTHER_LOGIN_OPTIONS,
    OTHER_LOGIN_DETAILS
}

export interface ProcessAuthFn {
    (loginType: LoginType, username: string, keyType: KeyType): Promise<void>
}

const SignInForm = forwardRef<SignInFormRef, SignInFormProps>(({ preferredKeyTypes, onComplete, i18nNamespace = 'smart-signer' }, ref) => {
    // component controllers
    const [step, setStep] = useState<Steps>(Steps.SAFE_STORAGE_LOGIN);
    const { t } = useTranslation(i18nNamespace);

    // provide methods to outside from here
    useImperativeHandle(ref, () => ({
        // this may be called for clearing process
        // when cancel sign in flow
        cancel() {
            // set cancelled state
        }
    }))


    // final form handlers
    const { errorMsg, onSubmit } = useProcessAuth(t);

    async function processAuth(loginType: LoginType, username: string, keyType: KeyType): Promise<void> {
        const schema: LoginFormSchema = {
            loginType,
            username,
            remember: false // TODO: handle this if required
        }

        await onSubmit(schema);
        onComplete();
    }

    return <div className="flex min-h-[350px] h-full">

        {
            step === Steps.SAFE_STORAGE_LOGIN && (
                <SafeStorage
                    preferredKeyTypes={preferredKeyTypes}
                    onSetStep={(step: Steps) => {
                        setStep(step);
                    }}
                    onProcessAuth={processAuth}
                    i18nNamespace={i18nNamespace}
                />
            )
        }

        {
            // TODO: Extract this to separate component 
            (step === Steps.OTHER_LOGIN_OPTIONS &&
                <Step title={t("login_form.other_signin_options")}>

                    <Button className='w-full' type='button' variant="secondary" onClick={() => {
                        setStep(Steps.SAFE_STORAGE_LOGIN);
                    }}>
                        <Icons.chevronLeft className='mr-2 h-4 w-4' />{t("login_form.go_back_button")}
                    </Button>

                </Step>
            )
        }
    </div>
})

export default SignInForm;