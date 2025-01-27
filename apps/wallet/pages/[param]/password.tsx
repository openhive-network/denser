import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ui/components/form';
import { useForm } from 'react-hook-form';
import { Checkbox, Separator } from '@hive/ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import WalletMenu from '@/wallet/components/wallet-menu';
import { getServerSidePropsDefault } from '../../lib/get-translations';
import { createWaxFoundation } from '@hiveio/wax';
import { useChangePasswordMutation } from '@/wallet/components/hooks/use-change-password-mutation';
import { handleError } from '@ui/lib/utils';
import { Icons } from '@ui/components/icons';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

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

export default function PostForm() {
  const { t } = useTranslation('common_wallet');
  const [isKeyGenerated, setIsKeyGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicKeys, setPublicKeys] = useState<{
    active: string;
    owner: string;
    posting: string;
  }>();
  const { username } = useSiteParams();
  const changePasswordMutation = useChangePasswordMutation();
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [derivedKeys, setDerivedKeys] = useState<DerivedKeys | null>(null);
  const [securityAccepted, setSecurityAccepted] = useState(false);

  const accountFormSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, 'Account name should be longer'),
        curr_password: z.string().min(2, { message: 'Required master password' }),
        genereted_password: z.string().refine((value) => value === generatedPassword, {
          message: 'Passwords do not match'
        }),
        understand_master: z.boolean().refine((value) => value === true, {
          message: 'Required'
        }),
        saved_password: z.boolean().refine((value) => value === true, {
          message: 'Required'
        }),
        understand_security: z.boolean().refine((value) => value === true, {
          message: 'Required'
        })
      }),
    [generatedPassword]
  );

  const form = useForm<z.infer<typeof accountFormSchema>>({
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

  async function onSubmit(_data: z.infer<typeof accountFormSchema>) {
    setLoading(true);
    try {
      const components = await resolveChangePasswordComponents(_data.curr_password);
      await changePasswordMutation.mutateAsync({ ...components });
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An error occurred while processing your request');
      }
      handleError(error, { method: 'changePassword', params: { ..._data } });
    } finally {
      setLoading(false);
    }
  }

  async function resolveChangePasswordComponents(password: string): Promise<{
    account: string;
    keys: Record<string, { old: string; new: string }>;
  }> {
    const hiveChain = await hiveChainService.getHiveChain();

    // password !== WIF
    const oldOwner = hiveChain.getPrivateKeyFromPassword(username, 'owner', password);
    const oldActive = hiveChain.getPrivateKeyFromPassword(username, 'active', password);
    const oldPosting = hiveChain.getPrivateKeyFromPassword(username, 'posting', password);

    // generate password
    const brainKeyData = hiveChain.suggestBrainKey();
    const passwordToBeSavedByUser = 'P' + brainKeyData.wifPrivateKey;

    // private keys for account authorities
    const newOwner = hiveChain.getPrivateKeyFromPassword(username, 'owner', passwordToBeSavedByUser);
    const newActive = hiveChain.getPrivateKeyFromPassword(username, 'active', passwordToBeSavedByUser);
    const newPosting = hiveChain.getPrivateKeyFromPassword(username, 'posting', passwordToBeSavedByUser);

    return {
      account: username,
      keys: {
        owner: {
          old: oldOwner.associatedPublicKey,
          new: newOwner.associatedPublicKey
        },
        active: {
          old: oldActive.associatedPublicKey,
          new: newActive.associatedPublicKey
        },
        posting: {
          old: oldPosting.associatedPublicKey,
          new: newPosting.associatedPublicKey
        }
      }
    };
  }

  async function handleKey() {
    const wax = await createWaxFoundation();
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

    const downloadKeys = () => {
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

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
    };

    return (
      <div>
        <div className="mt-4 rounded bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
          <h4 className="mb-1 font-semibold text-yellow-800 dark:text-yellow-200">Security Notes</h4>
          <ul className="list-disc space-y-0.5 pl-4 text-yellow-700 dark:text-yellow-300">
            <li>Save these keys immediately in a secure password manager</li>
            <li>The master password can derive all other keys</li>
            <li>Lost keys cannot be recovered</li>
            <li>Never share your private keys</li>
          </ul>
          <div className="mt-3">
            <FormField
              control={form.control}
              name="understand_security"
              render={({ field }) => (
                <FormItem className="flex items-center">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        setSecurityAccepted(checked as boolean);
                      }}
                    />
                  </FormControl>
                  <FormLabel className="text-xs mt-0">
                    I understand and accept these security implications
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>

        {securityAccepted && form.getValues().understand_security && (
          <>
            <div className="mb-4 mt-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-destructive">New Account Keys</h3>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowKeys(!showKeys)}>
                  {showKeys ? <span>Hide</span> : <span>Show</span>}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadKeys}>
                  <Icons.arrowDownCircle className="mr-1 h-4 w-4" />
                  Save All
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              {keys.map((key) => (
                <div key={key.type} className="rounded border border-border bg-background p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{key.type} Key</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key.value)}
                      className="h-7 px-2"
                    >
                      <Icons.copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-1 break-all font-mono text-xs">
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
    <ProfileLayout>
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
                  <FormLabel className="flex justify-between">
                    <span>{t('change_password_page.current_password')}</span>{' '}
                    <Link
                      className="pointer-events-none text-destructive opacity-70"
                      href="/recover_account_step_1"
                    >
                      {t('change_password_page.recover_password')}
                    </Link>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={t('change_password_page.current_password')}
                    />
                  </FormControl>
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
                  variant="secondary"
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
                    <Input {...field} />
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
    </ProfileLayout>
  );
}
