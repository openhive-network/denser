/* Sign-in with safe storage (use beekeeper wallet through hb-auth) */
import { forwardRef, ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthUser, OnlineClient } from '@hiveio/hb-auth';
import { handleAuthError, isKeyUpdateNeeded, isAlreadyRegistered } from '@smart-signer/lib/auth-error';
import { findSupersededKeyWrite, SUPERSEDED_KEY_WRITE_MESSAGE } from '@smart-signer/lib/superseded-key-write';
import { shouldOfferPasskey } from '@smart-signer/lib/auth/passkey-prompt-offer';
import {
  adoptReplacedPasskey,
  registerPasskeyUnlock,
  reusePasskeyUnlockOf
} from '@smart-signer/lib/passkey-unlock/passkey-unlock';
import { withSignInCheck } from '@smart-signer/lib/signer/sign-in-check';
import { useShownActiveCheck } from '@smart-signer/lib/auth/use-active-check-setting';
import { hiveSafeStorageUsers } from '@hive/common-hiveio-packages/lite-wallet-users';
import { SafeStorageStartError } from '@hive/common-hiveio-packages';
import PasskeyPrompt from '../passkey-prompt';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { username } from '@smart-signer/lib/auth/utils';
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { handleError } from '@ui/lib/handle-error';
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
  DropdownMenuItem
} from '@hive/ui';
import Step from '../step';
import MethodInfo from '../method-info';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { Steps } from '../form';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';
import { withTranslatedErrors } from '@smart-signer/lib/validators/translated-errors';
import { describeRefusedKey } from '@smart-signer/lib/validators/validate-key-authority';
import { findRegistrationKeyRoleHint } from '@smart-signer/lib/validators/key-role-hint';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { newPasswordSchema, passwordSchema } from '@smart-signer/lib/validators/validate-password';
import { useSafeStorageKeyCheck } from './use-safe-storage-key-check';
import { useWrongPasswordError } from './use-wrong-password-error';
import { useLinkedPasskeyUnlock } from './use-linked-passkey-unlock';
import PasskeyUnlockFailingNotice from './passkey-unlock-failing-notice';
import ExtensionSignIn, { hasInjectedExtension } from './extension-sign-in';
import StrictModeCheckbox from './strict-mode-checkbox';
import StrictModeStatus from './strict-mode-status';
import ActiveCheckCheckbox from './active-check-checkbox';
import { useStoredStrictMode } from './use-stored-strict-mode';
import { useInjectedExtensions } from './use-injected-extensions';
import { registerSafeStorageKey } from '@smart-signer/lib/signer/safe-storage-registration';
import { SHARED_KEY_LOOKUP } from '@smart-signer/lib/auth/shared-key-types';
import { requestPersistentKeyStorage } from '@smart-signer/lib/signer/safe-storage-keys';
import { authenticateStoredKey } from '@smart-signer/lib/auth/safe-storage-unlock';
import { findWrongSafeStoragePassword } from '@smart-signer/lib/wrong-safe-storage-password';
import { chooseSessionTime } from '@ui/lib/session-time-choice';
import { useSessionTime } from '@ui/hooks/use-session-time';
import SessionTimeSelect from './session-time-select';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

function getFormSchema() {
  return z
    .object({
      username,
      password: passwordSchema,
      wif: z.string(),
      keyType: z.nativeEnum(KeyType, {
        invalid_type_error: 'login_form.zod_error.invalid_keytype',
        required_error: 'login_form.zod_error.keytype_required'
      }),
      userFound: z.boolean(),
      strict: z.boolean(),
      requireActiveCheck: z.boolean()
    })
    .superRefine(async (val, ctx) => {
      if (!val.userFound) {
        // A new wallet's password; an existing one is checked against no maximum
        for (const { message } of newPasswordSchema.safeParse(val.password).error?.issues ?? []) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ['password'] });
        }
        const result = await validateWifKey(val.wif);
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
  signIn: (loginType: LoginType, username: string, keyType: KeyType) => Promise<boolean>;
  username: string;
  onUsernameChange: (username: string) => void;
  /** Shown on mount: why the step before this one sent the user back here */
  initialError?: string | null;
  /** Shown until the stored accounts are read; a spinner when omitted */
  placeholder?: ReactNode;
  /**
   * Whether opening the form asks the passkey of a linked account at once: when the sign-in opens,
   * not when the user comes back to it from another step
   */
  askPasskeyOnOpen?: boolean;
}

type SafeStorageForm = z.infer<ReturnType<typeof getFormSchema>>;

const SafeStorage = forwardRef<SafeStorageRef, SafeStorageProps>(
  (
    {
      onSetStep,
      signIn,
      preferredKeyTypes,
      i18nNamespace,
      isSigned,
      username,
      onUsernameChange,
      initialError = null,
      placeholder,
      askPasskeyOnOpen = true
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({
      async cancel() {
        await cancelAuth(username);
      }
    }));

    const { t } = useSharedTranslation(i18nNamespace);
    const translateSignerKey = (key: string) => t(key, { ns: SMART_SIGNER_NAMESPACE });
    const authClient = useRef<OnlineClient | undefined>(undefined);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState<boolean | undefined>(undefined);
    const [error, setError] = useState<string | null>(initialError);
    const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
    const [lastAuthPassword, setLastAuthPassword] = useState<string>('');
    const pendingFinalizeRef = useRef<SafeStorageForm | null>(null);
    const passkeyUnlock = useLinkedPasskeyUnlock();
    // The account the form itself switched to, after a passkey it asked: not the user's change to ask for
    const ownUsernameChange = useRef<string | null>(null);
    // The account the user picked from the menu, whose passkey is asked at once
    const pickedUsername = useRef<string | null>(null);
    const [failingPasskeyUsername, setFailingPasskeyUsername] = useState<string | null>(null);
    const [setUpAgainUsername, setSetUpAgainUsername] = useState<string | null>(null);
    const [show, setShow] = useState<{ password: boolean; wif: boolean }>({
      password: false,
      wif: false
    });
    const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
    const storedSessionTime = useSessionTime();
    // Stored only on sign-in: a stored choice moves every app's pages to a worker locking after it
    const [pickedSessionTime, setPickedSessionTime] = useState<number | null>(null);
    const sessionTime = pickedSessionTime ?? storedSessionTime;
    const extensions = useInjectedExtensions();
    const form = useForm<SafeStorageForm>({
      mode: 'onChange',
      resolver: withTranslatedErrors(zodResolver(getFormSchema()), translateSignerKey),
      defaultValues: {
        username,
        password: '',
        wif: '',
        keyType: preferredKeyTypes[0],
        userFound: true,
        strict: true,
        requireActiveCheck: false
      }
    });

    /** The client of this app's current worker: the one held since mount may have been replaced */
    async function getAuthClient(): Promise<OnlineClient> {
      authClient.current = await hbauthService.getOnlineClient();
      return authClient.current;
    }

    const isSessionTimePicked = pickedSessionTime !== null && pickedSessionTime !== storedSessionTime;

    /** Stores the idle lock picked, before the client the sign-in unlocks is asked for */
    function storePickedSessionTime() {
      if (isSessionTimePicked) chooseSessionTime(pickedSessionTime);
    }

    const watchedUsername = form.watch('username');
    const keyCheck = useSafeStorageKeyCheck({
      i18nNamespace,
      fields: {
        username: watchedUsername,
        keyType: form.watch('keyType'),
        wif: form.watch('wif'),
        strict: form.watch('strict')
      },
      showKeyError: (message) => form.setError('wif', { message }),
      revalidateKey: () => form.trigger('wif')
    });
    const wrongPassword = useWrongPasswordError(i18nNamespace, form.watch('password'));
    const shownError = error ?? wrongPassword.message;

    // A password error is about the account it was entered for
    const errorUsername = useRef(watchedUsername);
    useEffect(() => {
      if (errorUsername.current === watchedUsername) return;
      errorUsername.current = watchedUsername;
      setError(null);
      wrongPassword.clear();
      // The password was typed for the account the user left
      form.resetField('password');
      // The prompt open is for the account the user left: ask the passkey of this one instead
      const aborted = passkeyUnlock.abortOtherThan(watchedUsername);
      const own = ownUsernameChange.current === watchedUsername;
      const picked = pickedUsername.current === watchedUsername;
      ownUsernameChange.current = null;
      pickedUsername.current = null;
      if (picked && !passkeyUnlock.isAsking(watchedUsername)) {
        switchPasskeyUnlock(watchedUsername, aborted);
        return;
      }
      if (aborted) setLoading(false);
      if (own || passkeyUnlock.isAsking(watchedUsername)) return;
      // Typed letter by letter, the field passes through every prefix of the name: ask for the one it settles on
      passkeyUnlock.askOnceSettled(() => switchPasskeyUnlock(watchedUsername, false));
    }, [watchedUsername]);

    /** Sets the form's account to `username`, which the form, not the user, chose */
    function showAccount(username: string) {
      if (form.getValues().username !== username) ownUsernameChange.current = username;
      form.setValue('username', username);
    }

    /** Whether `username`'s safe storage is locked and has a passkey unlock on this device */
    async function hasLinkedPasskey(client: OnlineClient, username: string, users: AuthUser[]): Promise<boolean> {
      const user = users.find((auth) => auth.username === username);
      if (!user || user.unlocked) return false;
      try {
        return await client.hasPasskey(username);
      } catch (error) {
        logger.info('Passkey unlock of %s not read: %s', username, error instanceof Error ? error.message : String(error));
        return false;
      }
    }

    /**
     * Signs in with the passkey the user picks: `username`'s, or that of another account linked on
     * this device, which the form then switches to. Resolves false, the password form to fill, where
     * it does not sign in, and null where the prompt was aborted for another account.
     */
    async function signInWithLinkedPasskey(client: OnlineClient, username: string, users: AuthUser[]): Promise<boolean | null> {
      setLoading(true);
      const accounts = users.map((user) => user.username);
      const outcome = await passkeyUnlock.unlock(client, username, form.getValues().keyType, accounts);
      if (!outcome) return null;
      showAccount(outcome.username);
      if (outcome.unlocked) {
        await finalize({ ...form.getValues(), username: outcome.username, password: outcome.password });
        return true;
      }
      if (outcome.wrongAccount) setError(t('login_form.passkey_prompt.unlock_wrong_account', { ns: SMART_SIGNER_NAMESPACE }));
      if (outcome.failingRepeatedly) setFailingPasskeyUsername(outcome.username);
      setLoading(false);
      return false;
    }

    /**
     * Asks the passkey of `username`, which the user changed to, where it is linked on this device;
     * `aborted`: the prompt of the account the user left was open, and the form waits for it
     */
    async function switchPasskeyUnlock(username: string, aborted: boolean) {
      try {
        const client = await getAuthClient();
        if (await hasLinkedPasskey(client, username, authUsers)) {
          await signInWithLinkedPasskey(client, username, authUsers);
        } else if (aborted) {
          setLoading(false);
        }
      } catch (error) {
        setError(handleAuthError(error, 'switchPasskeyUnlock', translateSignerKey));
        setLoading(false);
      }
    }

    async function onSave(values: SafeStorageForm) {
      const { username, password, wif, keyType, strict, requireActiveCheck } = values;
      try {
        setLoading(true);
        setError(null);
        if (!(await keyCheck.checkKey({ username, keyType, wif, strict }))) {
          setLoading(false);
          return;
        }
        storePickedSessionTime();
        try {
          await hbauthService.withOnlineClient((client) =>
            registerSafeStorageKey(
              client,
              { username, password, wif, keyType, strict, requireActiveCheck },
              SHARED_KEY_LOOKUP
            )
          );
        } catch (error) {
          const keyRoleHint = findRegistrationKeyRoleHint(error, keyType);
          if (!keyRoleHint) throw error;
          keyCheck.showKeyHint(await describeRefusedKey(username, keyType, wif, strict, keyRoleHint));
          setLoading(false);
          return;
        }
        await finalize(values);
        form.reset();
      } catch (error) {
        const supersededKeyWrite = findSupersededKeyWrite(error);
        const errorMessage = supersededKeyWrite
          ? t(SUPERSEDED_KEY_WRITE_MESSAGE, { ns: SMART_SIGNER_NAMESPACE, ...supersededKeyWrite })
          : handleAuthError(error, 'onSave', translateSignerKey);
        setError(errorMessage);
        setLoading(false);
      }
    }

    async function onAuthenticate(values: SafeStorageForm) {
      const { username, password, keyType } = values;
      try {
        setLoading(true);
        setError(null);
        wrongPassword.clear();
        if (isSessionTimePicked) {
          // The stored pick replaces the worker on the next client asked for: check the password first
          await hbauthService.withOnlineClient((client) => authenticateStoredKey(client, username, password, keyType));
          storePickedSessionTime();
        }
        // Check passkey support BEFORE finalize — finalize closes the dialog
        // and may unmount this component, so state updates after it are lost.
        const shouldPromptPasskey = await hbauthService.withOnlineClient(async (client) => {
          await authenticateStoredKey(client, username, password, keyType);
          await adoptReplacedPasskey(passkeyUnlock.failure(), username, password);
          // "Set up again" offers the unlock over the record of a passkey that no longer answers
          return setUpAgainUsername === username || shouldOfferPasskey(client, username);
        });

        if (shouldPromptPasskey) {
          setLastAuthPassword(password);
          pendingFinalizeRef.current = values;
          setShowPasskeyPrompt(true);
          setLoading(false);
        } else {
          await finalize(values);
        }
      } catch (error) {
        if (findWrongSafeStoragePassword(error)) {
          wrongPassword.refuse(password);
          setLoading(false);
          return;
        }
        if (isKeyUpdateNeeded(error) || isAlreadyRegistered(error)) {
          onSetStep(Steps.SAFE_STORAGE_KEY_UPDATE);
          return;
        }
        const errorMessage = handleAuthError(error, 'onAuthenticate', translateSignerKey);
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

    /** Signs in with the key `password` just unlocked: its login transaction asks for no check of its own */
    async function finalize({ username, keyType, password }: SafeStorageForm) {
      try {
        setLoading(true);
        await withSignInCheck(username, KeyType[keyType], password ? { password } : undefined, () =>
          signIn(LoginType.hbauth, username, KeyType[keyType])
        );
        requestPersistentKeyStorage();
      } catch (error) {
        const errorMessage = handleAuthError(error, 'finalize', translateSignerKey);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    async function signInWithExtension(loginType: LoginType.keychain | LoginType.peakvault) {
      // Cover the form before validating, or a second click lands while validation is pending
      setLoading(true);
      try {
        if (!(await form.trigger('username'))) return;
        const { username, keyType } = form.getValues();
        await signIn(loginType, username, keyType);
      } catch (error) {
        handleError(error, { method: 'signIn', params: { loginType } });
      } finally {
        setLoading(false);
      }
    }

    async function cancelAuth(username: string): Promise<void> {
      passkeyUnlock.close();
      // Back to the account the form opened with, which is the form's change, not the user's
      showAccount(form.formState.defaultValues?.username ?? '');
      form.reset();
      const client = await getAuthClient();
      await client.logout(username);
      const users = await client.getAuths();
      setAuthUsers(hiveSafeStorageUsers(users));
      setLoading(false);
    }

    useEffect(() => {
      (async () => {
        try {
          // populate authUsers with existing user list
          authClient.current = await hbauthService.getOnlineClient();

          // The lite accounts' entries are the blog's own, not Hive accounts to sign in as
          const auths = hiveSafeStorageUsers(await authClient.current.getRegisteredUsers());
          setAuthUsers(auths);

          // Auto-trigger biometric unlock if a passkey is registered
          if (askPasskeyOnOpen && auths.length > 0 && username) {
            const targetUser = auths.find((a) => a.username === username) ?? auths[0];
            if (await hasLinkedPasskey(authClient.current, targetUser.username, auths)) {
              showAccount(targetUser.username);
              // Aborted for another account: the unlock that account started holds the form
              if ((await signInWithLinkedPasskey(authClient.current, targetUser.username, auths)) !== false) return;
            }
          }
          setLoading(false);
        } catch (error) {
          const errorMessage = handleAuthError(error, 'SafeStorage.useEffect', translateSignerKey);
          setError(
            error instanceof SafeStorageStartError
              ? t('login_form.signin_safe_storage.start_failed', { ns: SMART_SIGNER_NAMESPACE })
              : errorMessage
          );
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
          setDescription(
            t('login_form.signin_safe_storage.description_unlocked', { keyType: form.getValues().keyType })
          );
        } else {
          setDescription(t('login_form.signin_safe_storage.description_unlock'));
        }
      } else {
        setDescription(t('login_form.signin_safe_storage.description_save', { keyType: form.getValues().keyType }));
      }

      form.setValue('userFound', found ? true : false);
      return found;
      /* eslint-disable react-hooks/exhaustive-deps */
    }, [form.watch('username'), authUsers, t]);

    const storedStrict = useStoredStrictMode(userFound?.username, form.watch('keyType'));
    const storedActiveCheck = useShownActiveCheck(userFound?.username);
    const activeCheck = userFound ? storedActiveCheck : form.watch('requireActiveCheck');

    if (loading === undefined) return placeholder ?? <Step loading={true}></Step>;

    const stepTitle = (
      <span className="flex items-center gap-1">
        {t('login_form.signin_safe_storage.title')}
        <MethodInfo
          label={t('login_form.method_info.label', { method: t('login_form.safe_storage_name') })}
          info={t('login_form.method_info.safe_storage')}
          testId="method-info-safe_storage"
        />
      </span>
    );
    const stepDescription = (
      <div>
        <div data-testid="login-form-description">{description}</div>
        {passkeyUnlock.relinkUsername === watchedUsername && (
          <div className="text-sm" data-testid="passkey-relink-hint">
            {t('login_form.passkey_prompt.relink_hint', { ns: SMART_SIGNER_NAMESPACE })}
          </div>
        )}
        {shownError && (
          <div className="text-sm text-destructive" data-testid="safe-storage-error">
            {shownError}
          </div>
        )}
      </div>
    );

    // In place of the form, not under its buttons, where a phone's viewport ends before it
    if (showPasskeyPrompt) {
      return (
        <Step title={stepTitle} description={stepDescription} loading={loading}>
          <PasskeyPrompt
            username={form.getValues().username}
            onReuse={() => reusePasskeyUnlockOf(form.getValues().username, lastAuthPassword)}
            onCreate={() => registerPasskeyUnlock(form.getValues().username, lastAuthPassword)}
            onDone={async () => {
              setShowPasskeyPrompt(false);
              setLastAuthPassword('');
              if (pendingFinalizeRef.current) {
                await finalize(pendingFinalizeRef.current);
                pendingFinalizeRef.current = null;
              }
            }}
          />
        </Step>
      );
    }

    return (
      <Step title={stepTitle} description={stepDescription} loading={loading}>
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
                        onBlur={() => {
                          field.onBlur();
                          // A stored account signs in with the key safe storage holds: the key field is hidden
                          if (!form.getValues().userFound) keyCheck.checkEnteredKey();
                        }}
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
                                    pickedUsername.current = username;
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
                  {/* With the account it is about, not over the form; gone with the form once the offer shows */}
                  {failingPasskeyUsername === watchedUsername && (
                    <PasskeyUnlockFailingNotice
                      key={watchedUsername}
                      username={watchedUsername}
                      onSetUpAgain={() => setSetUpAgainUsername(watchedUsername)}
                    />
                  )}
                </FormItem>
              )}
            />

            {hasInjectedExtension(extensions) && (
              <ExtensionSignIn
                extensions={extensions}
                i18nNamespace={i18nNamespace}
                disabled={loading}
                onSignIn={signInWithExtension}
              />
            )}

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field, formState: { errors } }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder={t('login_form.signin_safe_storage.placeholder_password')}
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
                  {/* An emptied field is not wrong yet; the disabled button tells it is needed */}
                  {field.value ? (
                    <FormMessage className="font-normal" data-testid="password-error-message"></FormMessage>
                  ) : null}
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
                          placeholder={t('login_form.signin_safe_storage.placeholder_wif', { keyType: form.getValues().keyType })}
                          type={show.wif ? 'text' : 'password'}
                          data-testid="wif-input"
                          {...field}
                          onBlur={() => {
                            field.onBlur();
                            keyCheck.checkEnteredKey();
                          }}
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
                  <StrictModeCheckbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    i18nNamespace={i18nNamespace}
                  />
                )}
              />
            )}
            {!userFound && (
              <FormField
                control={form.control}
                name="requireActiveCheck"
                render={({ field }) => (
                  <ActiveCheckCheckbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            )}
            {userFound && storedStrict !== undefined && (
              <StrictModeStatus strict={storedStrict} i18nNamespace={i18nNamespace} />
            )}
            <SessionTimeSelect value={sessionTime} onChange={setPickedSessionTime} activeCheck={activeCheck} />
            {userFound && (
              <div className="flex justify-end">
                <span
                  onClick={() => onSetStep(Steps.SAFE_STORAGE_KEY_UPDATE)}
                  className="max-w-max cursor-pointer text-xs text-destructive hover:opacity-80 active:opacity-60"
                  data-testid="safe-storage-key-update-link"
                >
                  {t('login_form.signin_safe_storage.key_update')}
                </span>
              </div>
            )}
            {/* Show this for new user, otherwise show unlock then authorize */}
            <div className="flex select-none">
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
                cancelAuth(username);
                onSetStep(Steps.OTHER_LOGIN_OPTIONS);
              }}
            >
              <Icons.keyRound className="mr-2 h-4 w-4" />
              {t('login_form.other_signin_options')}
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
