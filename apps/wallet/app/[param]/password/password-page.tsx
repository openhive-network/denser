'use client';

import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@ui/components/form';
import { useForm } from 'react-hook-form';
import { Checkbox, Separator } from '@hive/ui';
import { Link } from '@hive/ui';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import WalletMenu from '@/wallet/components/wallet-menu';
import PasswordInput from '@/wallet/components/password-input';
import { useChangePasswordMutation } from '@/wallet/components/hooks/use-change-password-mutation';
import { handleError } from '@ui/lib/handle-error';
import { Icons } from '@ui/components/icons';
import { getChain } from '@transaction/lib/chain';
import { getAccount } from '@transaction/lib/hive-api';
import { cn } from '@ui/lib/utils';
import Loading from '@ui/components/loading';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import ChangePasswordConfirmDialog from '@/wallet/components/change-password-confirm-dialog';
import KeyChangeFollowUp from '@/wallet/components/key-change-follow-up';
import { isOwnAccount } from '@/wallet/lib/account-keys';
import {
  CredentialError,
  currentPublicKeys,
  passwordChange,
  roleAuthoritiesOf,
  type ChangedRole,
  type KeyDerivation
} from '@/wallet/lib/change-password-keys';

// New type for derived keys
interface DerivedKeys {
  master: string;
  owner: string;
  active: string;
  posting: string;
  memo: string;
}

// Add new types for key display
interface KeyDisplay {
  type: 'master' | 'owner' | 'active' | 'posting' | 'memo';
  value: string;
  description: string;
}

async function waxDerivation(): Promise<KeyDerivation> {
  const chain = await getChain();
  return {
    publicKeyOf: (wif) => chain.calculatePublicKey(wif),
    keyFromPassword: (account, role, password) => chain.getPrivateKeyFromPassword(account, role, password)
  };
}

/** The change password form on the signed-in user's own account; a notice to sign in as it elsewhere. */
export default function PasswordPage({ username }: { username: string }) {
  const { t } = useTranslation('common_wallet');
  const { user, isHydrated } = useUserClient();
  if (!isHydrated) return <Loading loading />;
  if (!isOwnAccount(user, username)) {
    return (
      <>
        <WalletMenu username={username} />
        <div className="m-auto flex max-w-2xl flex-col gap-4 bg-background p-2 pb-8">
          <div className="text-2xl font-bold">{t('change_password_page.change_password')}</div>
          <Separator />
          <p data-testid="change-password-sign-in-notice">
            {t('change_password_page.sign_in_notice', { username })}
          </p>
        </div>
      </>
    );
  }
  return <ChangePasswordForm username={username} />;
}

function ChangePasswordForm({ username }: { username: string }) {
  const { t } = useTranslation('common_wallet');
  const { loginType } = useUserClient().user;
  // The replaced keys, proven by the current credential, while the change awaits confirmation
  const [pendingKeys, setPendingKeys] = useState<Record<ChangedRole, string> | null>(null);
  const [isKeyGenerated, setIsKeyGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const changePasswordMutation = useChangePasswordMutation();
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [derivedKeys, setDerivedKeys] = useState<DerivedKeys | null>(null);
  const [securityAccepted, setSecurityAccepted] = useState(false);

  const accountFormSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('change_password_page.account_name_should_be_longer')),
        curr_password: z.string().min(2, { message: t('change_password_page.errors.required_credential') }),
        genereted_password: z.string().refine((value) => value === generatedPassword, {
          message: t('change_password_page.passwords_do_not_match')
        }),
        understand_master: z.boolean().refine((value) => value === true, {
          message: t('change_password_page.required')
        }),
        saved_password: z.boolean().refine((value) => value === true, {
          message: t('change_password_page.required')
        }),
        understand_security: z.boolean().refine((value) => value === true, {
          message: t('change_password_page.required')
        })
      }),
    [generatedPassword, t]
  );
  type PasswordFormValues = z.infer<typeof accountFormSchema>;

  const form = useForm<PasswordFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: username,
      curr_password: '',
      genereted_password: '',
      understand_master: false,
      understand_security: false,
      saved_password: false
    }
  });

  useEffect(() => {
    form.setValue('name', username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /** Checks the current credential against the account's keys, then asks to confirm the change. */
  async function onSubmit(data: z.infer<typeof accountFormSchema>) {
    if (!generatedPassword) {
      form.setError('genereted_password', { message: t('change_password_page.errors.generate_first') });
      return;
    }
    setLoading(true);
    try {
      const [derivation, account] = await Promise.all([waxDerivation(), getAccount(username)]);
      setPendingKeys(currentPublicKeys(username, data.curr_password, roleAuthoritiesOf(account), derivation));
    } catch (error) {
      if (!(error instanceof CredentialError)) {
        handleError(error, { method: 'changePasswordCredential', params: { account: username } });
        return;
      }
      form.setError('curr_password', {
        message: t(`change_password_page.errors.${error.code}`, {
          role: t(`permissions.${error.role}_key.name`)
        })
      });
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(current: Record<ChangedRole, string>, keepPosting: boolean) {
    setPendingKeys(null);
    setLoading(true);
    try {
      const change = passwordChange(username, current, generatedPassword, await waxDerivation(), keepPosting);
      await changePasswordMutation.mutateAsync(change);
      form.reset();
    } catch (error) {
      handleError(error, { method: 'changePassword', params: { account: username, keepPosting } });
    } finally {
      setLoading(false);
    }
  }

  async function handleKey() {
    const wax = await getChain();
    const brainKeyData = wax.suggestBrainKey();
    const passwordToBeSavedByUser = 'P' + brainKeyData.wifPrivateKey;

    const newKeys = {
      master: passwordToBeSavedByUser,
      owner: wax.getPrivateKeyFromPassword(username, 'owner', passwordToBeSavedByUser).wifPrivateKey,
      active: wax.getPrivateKeyFromPassword(username, 'active', passwordToBeSavedByUser).wifPrivateKey,
      posting: wax.getPrivateKeyFromPassword(username, 'posting', passwordToBeSavedByUser).wifPrivateKey,
      memo: wax.getPrivateKeyFromPassword(username, 'memo', passwordToBeSavedByUser).wifPrivateKey
    };

    setDerivedKeys(newKeys);
    setGeneratedPassword(passwordToBeSavedByUser);
    setIsKeyGenerated(true);
  }

  // Modify the UI part for displaying generated credentials
  const KeyDisplaySection = ({ derivedKeys }: { derivedKeys: DerivedKeys }) => {
    const { t } = useTranslation('common_wallet');
    const [showKeys, setShowKeys] = useState(false);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const keys: KeyDisplay[] = [
      {
        type: 'master',
        value: derivedKeys.master,
        description: t('permissions.master_key.info')
      },
      {
        type: 'owner',
        value: derivedKeys.owner,
        description: t('permissions.owner_key.info')
      },
      {
        type: 'active',
        value: derivedKeys.active,
        description: t('permissions.active_key.info')
      },
      {
        type: 'posting',
        value: derivedKeys.posting,
        description: t('permissions.posting_key.info')
      },
      {
        type: 'memo',
        value: derivedKeys.memo,
        description: t('permissions.memo_key.info')
      }
    ];

    const copyToClipboard = (text: string, keyType: string) => {
      // SSR guard - clipboard API is only available in browser
      if (typeof window === 'undefined' || !navigator.clipboard) {
        console.warn('Clipboard API not available');
        return;
      }

      navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [keyType]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [keyType]: false }));
      }, 2000);
    };

    const downloadKeys = () => {
      // SSR guard - DOM APIs are only available in browser
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.warn('Download not available on server');
        return;
      }

      const content = `HIVE ACCOUNT: ${username}
GENERATED: ${new Date().toISOString()}

${keys.map((k) => `${k.type.toUpperCase()} KEY:\n${k.value}\n`).join('\n---\n\n')}

IMPORTANT:
- Save these keys immediately in a secure password manager
- The master password can derive all other keys
- Lost keys cannot be recovered
- Never share your private keys`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hive-keys-${username}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <div>
        <div className="mt-4 rounded bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
          <h4 className="mb-1 font-semibold text-yellow-800 dark:text-yellow-200">
            {t('change_password_page.security_notes.title')}
          </h4>
          <ul className="list-disc space-y-0.5 pl-4 text-yellow-700 dark:text-yellow-300">
            <li>{t('change_password_page.security_notes.m1')}</li>
            <li>{t('change_password_page.security_notes.m2')}</li>
            <li>{t('change_password_page.security_notes.m3')}</li>
            <li>{t('change_password_page.security_notes.m4')}</li>
          </ul>
          <div className="mt-3">
            <FormField
              control={form.control}
              name="understand_security"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl className="flex items-center">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setSecurityAccepted(checked as boolean);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs">
                      {t('change_password_page.security_notes.confirm_security')}
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {securityAccepted && form.getValues().understand_security && (
          <>
            <div className="mb-4 mt-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-destructive">{t('change_password_page.new_keys')}</h3>
              <div className="space-x-2 flex items-center">
                <Button variant="outline" size="sm" onClick={() => setShowKeys(!showKeys)}>
                  {showKeys ? t('change_password_page.hide') : t('change_password_page.show')}
                </Button>
                <Button variant="outlineRed" size="sm" onClick={downloadKeys}>
                  <Icons.arrowDownCircle className="mr-1 h-4 w-4" />
                  {t('change_password_page.save_all')}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              {keys.map((key) => (
                <div key={key.type} className="rounded border border-border bg-background p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {t(`change_password_page.key_titles.${key.type}`)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key.value, key.type)}
                      className={cn(
                        'h-7 px-2 transition-colors duration-200',
                        copiedStates[key.type] && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      )}
                    >
                      {copiedStates[key.type] ? (
                        <Icons.check className="h-3 w-3" />
                      ) : (
                        <Icons.copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-1 break-all font-mono text-xs" data-testid={`generated-key-${key.type}`}>
                    {showKeys ? key.value : '••••••••••••••••••••••••••'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <WalletMenu username={username} />
      <div className="m-auto flex max-w-2xl flex-col gap-4 bg-background p-2 pb-8">
        <div className="text-2xl font-bold">{t('change_password_page.change_password')}</div>
        <Separator />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('change_password_page.account_name')}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled value={username} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="curr_password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel>{t('change_password_page.current_credential')}</FormLabel>
                    <Link
                      className="pointer-events-none text-sm text-destructive opacity-70"
                      href="/recover_account_step_1"
                    >
                      {t('change_password_page.recover_password')}
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      autoComplete="current-password"
                      placeholder={t('change_password_page.current_credential')}
                    />
                  </FormControl>
                  <FormDescription>{t('change_password_page.current_credential_help')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <div className="text-sm font-semibold">{t('change_password_page.generated_password')}</div>
              {isKeyGenerated && derivedKeys ? (
                <KeyDisplaySection derivedKeys={derivedKeys} />
              ) : (
                <Button
                  className="my-1"
                  variant="destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleKey();
                  }}
                >
                  {t('change_password_page.click_to_generate_password')}
                </Button>
              )}
            </div>
            <FormField
              control={form.control}
              name="genereted_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('change_password_page.re_enter_generate_password')}</FormLabel>
                  <FormControl>
                    <PasswordInput {...field} autoComplete="new-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="understand_master"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs">{t('change_password_page.understand_that')} </FormLabel>{' '}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="saved_password"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>

                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-xs">{t('change_password_page.i_saved_password')}</FormLabel>{' '}
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              <KeyChangeFollowUp loginType={loginType} />
            </div>
            <Button
              type="submit"
              variant="redHover"
              disabled={loading || !form.formState.isValid}
              className="flex w-[164px] justify-center"
            >
              {loading ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                t('change_password_page.update_password')
              )}
            </Button>
          </form>
        </Form>
      </div>
      <ChangePasswordConfirmDialog
        open={pendingKeys !== null}
        loginType={loginType}
        onConfirm={(keepPosting) => pendingKeys && onConfirm(pendingKeys, keepPosting)}
        onCancel={() => setPendingKeys(null)}
      />
    </>
  );
}
