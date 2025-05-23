/* Component that represents other (secondary) auth options */
import { FC, useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'next-i18next';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator
} from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import { Steps } from '../form';
import Step from '../step';
import { username } from '@smart-signer/lib/auth/utils';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { handleError } from '@ui/lib/handle-error';
export interface MethodsProps {
  onSetStep: (step: Steps) => void;
  i18nNamespace: string;
  preferredKeyTypes: KeyType[];
  username: string;
  onUsernameChange: (username: string) => void;
  sign: (loginType: LoginType, username: string, keyType: KeyType) => Promise<void>;
  submit: (username: string) => Promise<void>;
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

const Methods: FC<MethodsProps> = ({
  onSetStep,
  i18nNamespace = 'smart-signer',
  preferredKeyTypes,
  username,
  onUsernameChange,
  sign,
  submit
}) => {
  const { t } = useTranslation(i18nNamespace);
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: username,
      keyType: preferredKeyTypes[0],
      loginType: LoginType.hbauth
    },
    mode: 'onChange'
  });

  useEffect(() => {
    form.trigger('keyType');

    return () => {
      form.reset();
    };
  }, [form]);

  useEffect(() => {
    const formUsername = form.getValues('username');
    if (formUsername !== username) {
      onUsernameChange(formUsername);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.getValues('username'), onUsernameChange]);

  async function onSubmit(_loginType: LoginType) {
    try {
      setLoading(true);
      form.setValue('loginType', _loginType);

      const { username, keyType, loginType } = form.getValues();

      await sign(loginType, username, keyType);
      await submit(username);
    } catch (error: unknown) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Step
      loading={loading}
      title={t('login_form.other_signin_options')}
      description={
        <div>
          <div data-testid="other-signin-options-description">
            {t('login_form.other_signing_options_description')}
          </div>
        </div>
      }
    >
      <Form {...form}>
        <form className="space-y-4" name="signin" onSubmit={form.handleSubmit(() => null)}>
          {/* Username */}
          <FormField
            control={form.control}
            name="username"
            render={({ field, formState: { errors } }) => (
              <FormItem>
                <FormControl>
                  {/* Place holder, enter username if there is no user, otherwise select user from menu or enter new user*/}
                  <div className="relative flex">
                    <Input
                      placeholder={t('login_form.signin_safe_storage.placeholder_username')}
                      type="text"
                      autoComplete="username"
                      {...field}
                      data-testid="other-signin-options-username-input"
                    />
                  </div>
                  {/* Show select menu if there is length of auth users */}
                </FormControl>
                {errors.username && (
                  <FormMessage className="font-normal" data-testid="other-signin-username-error-msg">
                    {t(errors.username?.message!)}
                  </FormMessage>
                )}
              </FormItem>
            )}
          />

          {/* Key Type selection is shown if there is more than one preferred key type */}
          {preferredKeyTypes.length > 1 && (
            <FormField
              control={form.control}
              name="keyType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      className="mb-8 flex"
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      {...field}
                    >
                      {preferredKeyTypes.map((type) => {
                        return (
                          <div key={type} className="flex items-center space-x-2">
                            <RadioGroupItem value={type} id={type} />
                            <Label htmlFor={type} className="capitalize">
                              {type}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="font-normal" />
                </FormItem>
              )}
            />
          )}

          <div className="flex flex-col items-start">
            <Button
              disabled={!form.formState.isValid}
              className="flex w-full justify-start py-6"
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(() => onSubmit(LoginType.keychain))}
              data-testid="hive-keychain-extension-button"
            >
              <Icons.hivekeychain className="mr-4 h-8 w-8" />
              {t('login_form.signin_with_keychain')}
            </Button>

            <Separator className="my-1 w-full" />

            <Button
              disabled={!form.formState.isValid}
              className="flex w-full py-6"
              type="button"
              variant="ghost"
              onClick={form.handleSubmit(() => onSubmit(LoginType.wif))}
              data-testid="sign-in-with-wif-button"
            >
              <div className="flex flex-1 items-center">
                <Icons.keyRound className="mr-4 h-8 w-8" />
                {t('login_form.signin_with_wif')}
              </div>
            </Button>

            <Separator className="my-1 w-full" />

            <Button
              disabled
              className="flex w-full py-6"
              type="button"
              variant="ghost"
              data-testid="hive-auth-button"
            >
              <div className="flex flex-1 items-center">
                <Icons.hiveauth className="mr-4 h-8 w-8" />
                {t('login_form.signin_with_hiveauth')}
              </div>
            </Button>

            <Separator className="my-1 w-full" />

            <Button
              disabled
              className="flex w-full justify-start py-6"
              type="button"
              variant="ghost"
              data-testid="hive-signer-button"
            >
              <Icons.hivesigner className="mr-4 h-8 w-8" />
              {t('login_form.signin_with_hivesigner')}
            </Button>

            <Button
              className="mt-8 w-full"
              type="button"
              variant="secondary"
              onClick={() => {
                onSetStep(Steps.SAFE_STORAGE_LOGIN);
              }}
              data-testid="go-back-button"
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
