/* Sign-in with safe storage (use beekeeper wallet through hb-auth) */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthUser, OnlineClient } from '@hiveio/hb-auth';
import { handleAuthError, isKeyUpdateNeeded, isAlreadyRegistered } from '@smart-signer/lib/auth-error';
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
  Checkbox,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@hive/ui';
import Step from '../step';
import { Steps } from '../form';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';
import { passwordSchema } from '@smart-signer/lib/validators/validate-password';

function getFormSchema() {
  return z
    .object({
      username,
      password: passwordSchema,
      wif: z.string(),
      keyType: z.nativeEnum(KeyType, {
        invalid_type_error: 'Invalid keyType',
        required_error: 'keyType is required'
      }),
      userFound: z.boolean(),
      strict: z.boolean()
    })
    .superRefine((val, ctx) => {
      if (!val.userFound) {
        const result = validateWifKey(val.wif);
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
        await cancelAuth(username);
      }
    }));

    const authClient = useRef<OnlineClient>();
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState<boolean | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
    const [lastAuthPassword, setLastAuthPassword] = useState<string>('');
    const pendingFinalizeRef = useRef<SafeStorageForm | null>(null);
    const [show, setShow] = useState<{ password: boolean; wif: boolean }>({
      password: false,
      wif: false
    });
    const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
    const form = useForm<SafeStorageForm>({
      mode: 'onChange',
      resolver: zodResolver(getFormSchema()),
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
      const { username, password, wif, keyType, strict } = values;
      try {
        setLoading(true);
        setError(null);
        await authClient.current?.register(username, password, wif, keyType, strict);
        await finalize(values);
        form.reset();
      } catch (error) {
        const errorMessage = handleAuthError(error, 'onSave');
        setError(errorMessage);
        setLoading(false);
      }
    }

    async function onAuthenticate(values: SafeStorageForm) {
      const { username, password, keyType } = values;
      try {
        setLoading(true);
        setError(null);
        await authClient.current?.authenticate(username, password, keyType);

        // Check passkey support BEFORE finalize — finalize closes the dialog
        // and may unmount this component, so state updates after it are lost.
        let shouldPromptPasskey = false;
        try {
          const client = authClient.current;
          if (client) {
            const supported = await client.isPasskeySupported();
            const hasPasskey = await client.hasPasskey(username);
            const dismissedRaw = localStorage.getItem(`passkey-dismissed-${username}`);
            let dismissed = false;
            if (dismissedRaw === 'never') {
              dismissed = true;
            } else if (dismissedRaw) {
              // Timestamp-based dismiss — re-ask after 8 hours
              dismissed = Date.now() - Number(dismissedRaw) < 8 * 60 * 60 * 1000;
            }
            shouldPromptPasskey = supported && !hasPasskey && !dismissed;
          }
        } catch {
          // Non-critical — silently skip passkey prompt on any error
        }

        if (shouldPromptPasskey) {
          setLastAuthPassword(password);
          pendingFinalizeRef.current = values;
          setShowPasskeyPrompt(true);
          setLoading(false);
        } else {
          await finalize(values);
        }
      } catch (error) {
        if (isKeyUpdateNeeded(error) || isAlreadyRegistered(error)) {
          onSetStep(Steps.SAFE_STORAGE_KEY_UPDATE);
          return;
        }
        const errorMessage = handleAuthError(error, 'onAuthenticate');
        setError(errorMessage);
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
        // Request persistent storage to reduce risk of browser evicting IndexedDB keys.
        // This is a best-effort hint — browsers may ignore it.
        if (navigator.storage?.persist) {
          navigator.storage.persist().catch(() => {});
        }
      } catch (error) {
        const errorMessage = handleAuthError(error, 'finalize');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    async function cancelAuth(username: string): Promise<void> {
      form.reset();
      await authClient?.current?.logout(username);
      const users = (await authClient.current?.getAuths()) || [];
      setAuthUsers(users);
      setLoading(false);
    }

    useEffect(() => {
      (async () => {
        try {
          // populate authUsers with existing user list
          authClient.current = await hbauthService.getOnlineClient();

          const auths = await authClient.current.getRegisteredUsers();
          setAuthUsers(auths);

          // Auto-trigger biometric unlock if a passkey is registered.
          // Uses "discouraged" verification for posting key — minimal friction,
          // like the old WIF-in-session experience.
          if (auths.length > 0 && username) {
            const targetUser = auths.find((a) => a.username === username) ?? auths[0];
            if (targetUser && !targetUser.unlocked) {
              try {
                const hasPasskey = await authClient.current.hasPasskey(targetUser.username);
                if (hasPasskey) {
                  form.setValue('username', targetUser.username);
                  const keyType = form.getValues().keyType;
                  const uv = keyType === 'posting' ? 'discouraged' : 'required';
                  setLoading(true);
                  await authClient.current.biometricUnlock(targetUser.username, keyType, uv);
                  await finalize(form.getValues());
                  return;
                }
              } catch {
                // Biometric failed — show normal password form
              }
            }
          }
        } catch (error) {
          const errorMessage = handleAuthError(error, 'SafeStorage.useEffect');
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      })();
      /* eslint-disable react-hooks/exhaustive-deps */
    }, []);

    const userFound = useMemo(() => {
      const formUsername = form.getValues().username;
      onUsernameChange(formUsername);
      const found = authUsers.filter((user) => user.username === formUsername)[0];

      if (found?.username) {
        if (found?.unlocked) {
          setDescription(`Unlocked with ${form.getValues().keyType} key`);
        } else {
          setDescription('Unlock user with password');
        }
      } else {
        setDescription(`Save your ${form.getValues().keyType} key by filling form below`);
      }

      form.setValue('userFound', found ? true : false);
      return found;
      /* eslint-disable react-hooks/exhaustive-deps */
    }, [form.watch('username'), authUsers]);

    if (loading === undefined) return <Step loading={true}></Step>;

    return (
      <Step
        title="Sign in with safe storage"
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
                        placeholder="Username"
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
                      {errors.username?.message!}
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
                    <div className="relative">
                      <Input
                        placeholder="Safe storage password"
                        type={show.password ? 'text' : 'password'}
                        autoComplete="current-password"
                        data-testid="password-input"
                        {...field}
                      />
                      <Button
                        variant="ghost"
                        className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-1 hover:bg-transparent"
                        onClick={() => {
                          setShow((prev) => ({ ...prev, password: !prev.password }));
                        }}
                      >
                        {show.password ? <Icons.eyeOff /> : <Icons.eye />}
                      </Button>
                    </div>
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
                      <div className="relative">
                        <Input
                          placeholder={`WIF ${form.getValues().keyType} private key`}
                          type={show.wif ? 'text' : 'password'}
                          data-testid="wif-input"
                          {...field}
                        />
                        <Button
                          variant="ghost"
                          className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-1 hover:bg-transparent"
                          onClick={() => {
                            setShow((prev) => ({ ...prev, wif: !prev.wif }));
                          }}
                        >
                          {show.wif ? <Icons.eyeOff /> : <Icons.eye />}
                        </Button>
                      </div>
                    </FormControl>
                    {errors.wif && (
                      <FormMessage className="font-normal" data-testid="wif-input-error-message">
                        {errors.wif?.message!}
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
                      Direct Authority Mode
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Icons.info className="h-5 w-5" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          When enabled, the app will only allow adding keys with account's own authority. If
                          you want to add keys with other authority, please disable this mode.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              />
            )}
            {userFound && (
              <div className="flex justify-end">
                <span
                  onClick={() => onSetStep(Steps.SAFE_STORAGE_KEY_UPDATE)}
                  className="max-w-max cursor-pointer text-xs text-destructive hover:opacity-80 active:opacity-60"
                >
                  Add new key
                </span>
              </div>
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
                    Sign in
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
                  Save and sign in
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
                cancelAuth(username);
                onSetStep(Steps.OTHER_LOGIN_OPTIONS);
              }}
            >
              <Icons.keyRound className="mr-2 h-4 w-4" />
              Other sign in options
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

        {/* Passkey enrollment prompt — shown after successful password login */}
        {showPasskeyPrompt && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <p className="mb-2 text-sm font-medium">Enable biometric unlock?</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Use fingerprint, Face ID, or device PIN to unlock instead of typing your password.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-500"
                onClick={async () => {
                  try {
                    await authClient.current?.registerPasskey(
                      form.getValues().username,
                      lastAuthPassword
                    );
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setError(msg);
                  } finally {
                    setShowPasskeyPrompt(false);
                    setLastAuthPassword('');
                    if (pendingFinalizeRef.current) {
                      await finalize(pendingFinalizeRef.current);
                      pendingFinalizeRef.current = null;
                    }
                  }
                }}
              >
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  localStorage.setItem(
                    `passkey-dismissed-${form.getValues().username}`,
                    String(Date.now())
                  );
                  setShowPasskeyPrompt(false);
                  setLastAuthPassword('');
                  if (pendingFinalizeRef.current) {
                    await finalize(pendingFinalizeRef.current);
                    pendingFinalizeRef.current = null;
                  }
                }}
              >
                Not now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={async () => {
                  localStorage.setItem(
                    `passkey-dismissed-${form.getValues().username}`,
                    'never'
                  );
                  setShowPasskeyPrompt(false);
                  setLastAuthPassword('');
                  if (pendingFinalizeRef.current) {
                    await finalize(pendingFinalizeRef.current);
                    pendingFinalizeRef.current = null;
                  }
                }}
              >
                Never ask again
              </Button>
            </div>
          </div>
        )}
      </Step>
    );
  }
);

SafeStorage.displayName = 'SafeStorage';

export default SafeStorage;
