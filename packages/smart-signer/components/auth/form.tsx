/* Component that manages all available sign-in options */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { KeyAuthorityType } from '@hive/hb-auth';
import SafeStorage from './methods/safestorage';
import { Button } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import Step from './step';
import { PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { KeyType, LoginType } from '@smart-signer/types/common';

// Todo: Add steps/slides

/**
 * 1. slide options for safe storage sign-in and others button
 * 2. other options keychain, hiveauth, hivesigner
 * 3. specific view for selected sign in type from 2.
 * 
 * TODO: !!! Suspense first for each option
 */

export interface SignInFormProps {
    // This option is set only for safe storage (hb-auth)
    preferredKeyTypes: KeyAuthorityType[]
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

const SignInForm = forwardRef<SignInFormRef, SignInFormProps>(({ preferredKeyTypes }, ref) => {
    // component controllers
    const [step, setStep] = useState<Steps>(Steps.SAFE_STORAGE_LOGIN);

    // provide methods to outside from here
    useImperativeHandle(ref, () => ({
        // this may be called for clearing process
        // when cancel sign in flow
        cancel() {
            console.log('form cancelled')
        }
    }))

    // form handlers
    async function processAuth(loginType: LoginType, username: string, keyType: KeyType): Promise<void> {
        console.log('got for processing', username, loginType, keyType);
        // const schema: PostLoginSchema =  {

        // }
    }

    // TODO: Add proper loader indicator
    return <div className="flex min-h-[350px] h-full">

        {
            step === Steps.SAFE_STORAGE_LOGIN && (
                <SafeStorage
                    preferredKeyTypes={preferredKeyTypes}
                    onSetStep={(step: Steps) => {
                        setStep(step);
                    }}
                    onProcessAuth={processAuth}
                />
            )
        }

        {
            // TODO: Extract this to separate component 
            (step === Steps.OTHER_LOGIN_OPTIONS &&
                <Step title='Other sign in options'>

                    <Button className='w-full' type='button' variant="secondary" onClick={() => {
                        setStep(Steps.SAFE_STORAGE_LOGIN);
                    }}>
                        <Icons.chevronLeft className='mr-2 h-4 w-4' />Go Back
                    </Button>

                </Step>
            )
        }
    </div>
})

export default SignInForm;