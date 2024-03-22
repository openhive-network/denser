/* Component that manages all available sign-in options */
import { forwardRef, useImperativeHandle, useState } from 'react';
import SafeStorage from './methods/safestorage';
import { Button } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import Step from './step';

// Todo: Add steps/slides

/**
 * 1. slide options for safe storage sign-in and others button
 * 2. other options keychain, hiveauth, hivesigner
 * 3. specific view for selected sign in type from 2.
 * 
 * TODO: !!! Suspense first for each option
 */

export interface SignInFormProps { }
export type SignInFormRef = { cancel: () => void; };

enum Steps {
    SAFE_STORAGE_LOGIN = 1,
    OTHER_LOGIN_OPTIONS,
    OTHER_LOGIN_DETAILS
}

const SignInForm = forwardRef<SignInFormRef, SignInFormProps>(({ }, ref) => {
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


    // TODO: Add proper loader indicator
    return <div className="flex min-h-[350px] h-full">

        {
            step === Steps.SAFE_STORAGE_LOGIN && <SafeStorage onSetStep={() => {
                setStep(Steps.OTHER_LOGIN_OPTIONS);
            }} />
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