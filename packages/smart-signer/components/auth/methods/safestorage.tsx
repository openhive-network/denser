/* Sign-in with safe storage (use beekeeper wallet through hb-auth) */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { AuthUser, AuthorizationError, OnlineClient } from '@hiveio/hb-auth';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { username } from '@smart-signer/lib/auth/utils';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { Icons } from '@hive/ui/components/icons';
import {
  Input,
  RadioGroup,
  RadioGroupItem,
  Label,
  Button,
  Separator,
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Checkbox
} from '@hive/ui';
import Step from '../step';
import { Steps } from '../form';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { TFunction } from 'i18next';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';

function getFormSchema(t: TFunction<'smart-signer', undefined>) {
  return z
    .object({
      username,
      password: z.string().min(6, {
        message: t('login_form.zod_error.password_length')
      }),
      wif: z.string(),
      keyType: z.nativeEnum(KeyType, {
        invalid_type_error: t('login_form.zod_error.invalid_keytype'),
        required_error: t('login_form.zod_error.keytype_required')
      }),
      userFound: z.boolean(),
      strict: z.boolean()
    })
    .superRefine((val, ctx) => {
      if (!val.userFound) {
        const result = validateWifKey(val.wif, (v) => v);
        if (result) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result,
            path: ['wif'],
            fatal: true
          });
          return z.NEVER;
        }
      }
      return true;
    });
}

export type SafeStorageRef = { cancel: () => Promise<void> };

export interface SafeStorageProps {
  onSetStep: (step: Steps) => void;
  preferredKeyTypes: KeyType[];
  i18nNamespace: string;
  isSigned?: boolean;
  sign: (loginType: LoginType, username: string, keyType: KeyType) => Promise<void>;
  submit: (username: string) => Promise<void>;
  username: string;
  onUsernameChange: (username: string) => void;
}

type SafeStorageForm = z.infer<ReturnType<typeof getFormSchema>>;

const SafeStorage = forwardRef<SafeStorageRef, SafeStorageProps>(
  (
    { onSetStep, sign, submit, preferredKeyTypes, i18nNamespace, isSigned, username, onUsernameChange },
    ref
  ) => {
    useImperativeHandle(ref, () => ({
      async cancel() {
        await cancelAuth();
      }
    }));

    const authClient = useRef<OnlineClient>();
    const { t } = useTranslation(i18nNamespace);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState<boolean | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
    const form = useForm<SafeStorageForm>({
      mode: 'onChange',
      resolver: zodResolver(getFormSchema(t)),
      defaultValues: {
        username,
        password: '',
        wif: '',
        keyType: preferredKeyTypes[0],
        userFound: true,
        strict: true
      }
    });

    async function onSave(values: SafeStorageForm) {
      const { username, password, wif, keyType } = values;

      try {
        setLoading(true);
        setError(null);
        await authClient.current?.register(username, password, wif, keyType);
        await finalize(values);
        form.reset();
      } catch (error) {
        setError((error as AuthorizationError).message);
        setLoading(false);
      }
    }

    async function onAuthenticate(values: SafeStorageForm) {
      const { username, password, keyType } = values;
      try {
        setLoading(true);
        setError(null);
        await authClient.current?.authenticate(username, password, keyType);
        await finalize(values);
      } catch (error) {
        setError((error as AuthorizationError).message);
        setLoading(false);
      }
    }

    {
      /* TODO: Re-work offline flow */
    }
    // async function onUnlock({ username, password }: SafeStorageForm) {
    //     try {
    //         setError(null);
    //         await authClient.current?.unlock(username, password);
    //         setAuthUsers(await authClient.current?.getAuths() || []);
    //         form.setValue('password', '');
    //         form.setValue('wif', '');
    //     } catch (error) {
    //         setError((error as AuthorizationError).message);
    //         setLoading(false);
    //     }
    // }

    {
      /* TODO: Re-work offline flow */
    }
    // async function onSign({ username, keyType }: SafeStorageForm): Promise<void> {
    //     await sign(LoginType.hbauth, username, KeyType[keyType]);
    // }

    {
      /* TODO: Belongs to offline flow */
    }
    // async function onSubmitAuth({ username }: SafeStorageForm): Promise<void> {
    //     setLoading(true);
    //     await submit(username);
    //     setLoading(false);
    // }

    async function finalize({ username, keyType }: SafeStorageForm) {
      try {
        setLoading(true);
        await sign(LoginType.hbauth, username, KeyType[keyType]);
        await submit(username);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    async function cancelAuth(): Promise<void> {
      form.reset();
      await authClient?.current?.logout();
      const users = (await authClient.current?.getAuths()) || [];
      setAuthUsers(users);
      setLoading(false);
    }

    useEffect(() => {
      (async () => {
        try {
          // populate authUsers with existing user list
          authClient.current = await hbauthService.getOnlineClient(form.getValues().strict);

          const auths = await authClient.current.getAuths();

          setAuthUsers(auths);
        } catch (error) {
          setError((error as AuthorizationError).message);
        } finally {
          setLoading(false);
        }
      })();
      /* eslint-disable react-hooks/exhaustive-deps */
    }, [form.watch('strict')]);

    const userFound = useMemo(() => {
      const formUsername = form.getValues().username;
      onUsernameChange(formUsername);
      const found = authUsers.filter((user) => user.username === formUsername)[0];

      if (found?.username) {
        if (found?.unlocked) {
          setDescription(
            t('login_form.signin_safe_storage.description_unlocked', { keyType: form.getValues().keyType })
          );
        } else {
          setDescription(t('login_form.signin_safe_storage.description_unlock'));
        }
      } else {
        setDescription(
          t('login_form.signin_safe_storage.description_save', { keyType: form.getValues().keyType })
        );
      }

      form.setValue('userFound', found ? true : false);
      return found;
      /* eslint-disable react-hooks/exhaustive-deps */
    }, [form.watch('username'), authUsers]);

    if (loading === undefined) return <Step loading={true}></Step>;

    return (
      <Step
        title={t('login_form.signin_safe_storage.title')}
        description={
          <div>
            <div data-testid="login-form-description">{description}</div>
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
        }
        loading={loading}
      >
        <Form {...form}>
          <form className="space-y-4" name="register" onSubmit={form.handleSubmit(() => null)}>
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
                        data-testid="username-input"
                        {...field}
                      />
                      {authUsers.length ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="absolute right-0 top-0 p-2">
                            <Icons.chevronDown />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="absolute -right-7 w-56" side="bottom">
                            {authUsers.map(({ username }) => {
                              return (
                                <DropdownMenuItem
                                  className="cursor-pointer p-2"
                                  key={username}
                                  onSelect={() => {
                                    form.setValue('username', username);
                                    form.trigger(['username', 'wif']);
                                  }}
                                  disabled={form.getValues().username === username}
                                >
                                  {username}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                    {/* Show select menu if there is length of auth users */}
                  </FormControl>
                  {errors.username && (
                    <FormMessage className="font-normal" data-testid="username-error-message">
                      {t(errors.username?.message!)}
                    </FormMessage>
                  )}
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field, formState: { errors } }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t('login_form.signin_safe_storage.placeholder_password')}
                      type="password"
                      autoComplete="current-password"
                      data-testid="password-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="font-normal" data-testid="password-error-message"></FormMessage>
                  {/* {errors.password && <FormMessage className="font-normal">{t(errors.password?.message!)}</FormMessage>} */}
                </FormItem>
              )}
            />

            {/* WIF */}
            {!userFound && (
              <FormField
                control={form.control}
                name="wif"
                render={({ field, formState: { errors } }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder={t('login_form.signin_safe_storage.placeholder_wif', {
                          keyType: form.getValues().keyType
                        })}
                        type="password"
                        data-testid="wif-input"
                        {...field}
                      />
                    </FormControl>
                    {errors.wif && (
                      <FormMessage className="font-normal" data-testid="wif-input-error-message">
                        {t(errors.wif?.message!)}
                      </FormMessage>
                    )}
                  </FormItem>
                )}
              />
            )}

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

            {!userFound && (
              <FormField
                control={form.control}
                name="strict"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="strict"
                      onCheckedChange={async (isStrict) => {
                        field.onChange(isStrict);
                      }}
                      {...field}
                      checked={field.value}
                      value={field.value as unknown as string}
                    />
                    <label
                      htmlFor="strict"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t('login_form.signin_safe_storage.strict_mode')}
                    </label>
                  </div>
                )}
              />
            )}
            {/* Show this for new user, otherwise show unlock then authorize */}
            <div className="flex">
              {userFound ? (
                <>
                  <Button
                    className="w-full flex-1 bg-red-600 text-white hover:bg-red-500"
                    type="submit"
                    disabled={!form.formState.isValid}
                    onClick={form.handleSubmit(onAuthenticate)}
                  >
                    {t('login_form.signin_safe_storage.button_signin')}
                  </Button>
                  {/* TODO: Re-work offline flow */}
                  {/* <Button
                                                    className='w-full flex-1 ml-2'
                                                    type="submit"
                                                    variant={"outline"}
                                                    disabled={!form.formState.isDirty}
                                                    onClick={form.handleSubmit(onUnlock)}
                                                >
                                                    {t("login_form.signin_safe_storage.button_unlock")}
                                                </Button> */}
                </>
              ) : (
                <Button
                  className="w-full flex-1 bg-red-600 text-white hover:bg-red-500"
                  type="submit"
                  data-testid="save-sign-in-button"
                  disabled={!form.formState.isValid}
                  onClick={form.handleSubmit(onSave)}
                >
                  {t('login_form.signin_safe_storage.button_save')}
                </Button>
              )}
            </div>

            <Separator className="my-4" />

            <Button
              className="w-full"
              data-testid="other-sign-in-options-button"
              type="button"
              variant="secondary"
              onClick={() => {
                cancelAuth();
                onSetStep(Steps.OTHER_LOGIN_OPTIONS);
              }}
            >
              <Icons.keyRound className="mr-2 h-4 w-4" />
              {t('login_form.signin_safe_storage.button_other')}
            </Button>
          </form>

          {/* TODO: Re-work offline flow */}
          {/* (
                        <form onSubmit={form.handleSubmit(onSubmitAuth)}>
                            <p className="mb-4">
                                {t("login_form.signin_safe_storage.description_unlocked_detailed")}
                            </p>

                            <Button className="w-full mb-4" type="submit" disabled={isSigned} onClick={form.handleSubmit(onSign)}>{t("login_form.signin_safe_storage.button_sign_auth")}</Button>

                            <Button className='w-full' type='submit' disabled={form.getFieldState('keyType').invalid || !isSigned}>
                                {t("login_form.signin_safe_storage.button_signin_unlocked")}
                            </Button>
                            <Separator className='my-4' />

                            <Button className='w-full' type='button' variant="secondary" onClick={() => {
                                cancelAuth();
                                onSetStep(Steps.SAFE_STORAGE_LOGIN);
                            }}>
                                {t("login_form.signin_safe_storage.button_cancel")}
                            </Button>
                        </form>
                    ) */}
        </Form>
      </Step>
    );
  }
);

SafeStorage.displayName = 'SafeStorage';

export default SafeStorage;
