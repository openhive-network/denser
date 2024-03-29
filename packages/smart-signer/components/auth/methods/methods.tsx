/* Component that represents other (secondary) auth options */
import { FC, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'next-i18next';
import { Button, Form, Separator } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import { Steps } from '../form';
import Step from '../step';
import { username } from '@smart-signer/lib/auth/utils';
import { KeyType, LoginType } from '@smart-signer/types/common';

export interface MethodsProps {
  onSetStep: (step: Steps) => void;
  i18nNamespace: string;
  preferredKeyTypes: KeyType[];
}

const formSchema = z.object({
  username,
  keyType: z.nativeEnum(KeyType, {
    invalid_type_error: 'Invalid keyType',
    required_error: 'keyType is required'
  }),
  loginType: z.nativeEnum(LoginType, {
    invalid_type_error: 'Invalid loginType',
    required_error: 'loginType is required'
  })
});

const Methods: FC<MethodsProps> = ({ onSetStep, i18nNamespace = 'smart-signer', preferredKeyTypes }) => {
  const { t } = useTranslation(i18nNamespace);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      keyType: KeyType.posting,
      loginType: LoginType.hbauth
    }
  });

  function submit(loginType: LoginType) {
    setLoading(true);
    form.setValue('loginType', loginType);

    // error handling
  }

  return (
    <Step
      loading={loading}
      title={t('login_form.other_signin_options')}
      description={
        <div>
          <div>{t('login_form.other_signing_options_description')}</div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
      }
    >
      <Form {...form}>
        {/* fields here */}

        <form>
          <div className="flex flex-col items-start">
            <Button
              disabled={!form.formState.isValid}
              className="flex w-full justify-start py-6"
              type="button"
              variant="ghost"
            >
              {/* Add logo for that */}
              <Icons.keyRound className="mr-4 h-8 w-8" /> Hive Keychain extension
            </Button>

            <Separator className="my-1 w-full" />
            <Button
              disabled={!form.formState.isValid}
              className="flex w-full py-6"
              type="button"
              variant="ghost"
            >
              {/* Add logo for that */}
              <div className="flex flex-1 items-center">
                <Icons.keyRound className="mr-4 h-8 w-8" /> Sign in with WIF (Legacy)
              </div>
            </Button>

            <Separator className="my-1 w-full" />
            <Button disabled className="flex w-full py-6" type="button" variant="ghost">
              {/* Add logo for that */}
              <div className="flex flex-1 items-center">
                <Icons.hiveauth className="mr-4 h-8 w-8" /> HiveAuth
              </div>
            </Button>

            <Separator className="my-1 w-full" />

            <Button disabled className="flex w-full justify-start py-6" type="button" variant="ghost">
              <Icons.hivesigner className="mr-4 h-8 w-8" /> HiveSigner
            </Button>

            <Button
              className="mt-8 w-full"
              type="button"
              variant="secondary"
              onClick={() => {
                // change step here
                onSetStep(Steps.SAFE_STORAGE_LOGIN);
              }}
            >
              <Icons.chevronLeft className="mr-2 h-4 w-4" /> {t('login_form.go_back_button')}
            </Button>
          </div>
        </form>
      </Form>
    </Step>
  );
};

export default Methods;
