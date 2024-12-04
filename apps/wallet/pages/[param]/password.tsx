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

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

let key = '';
const accountFormSchema = z.object({
  name: z.string().min(2, 'Account name should be longer'),
  curr_password: z.string().min(2, { message: 'Required owner key or current password' }),
  genereted_password: z.string().refine((value) => value === key, {
    message: 'Passwords do not match'
  }),
  understand: z.boolean().refine((value) => value === true, {
    message: 'Required'
  }),
  saved_password: z.boolean().refine((value) => value === true, {
    message: 'Required'
  })
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

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

  const form = useForm<AccountFormValues>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: username,
      curr_password: '',
      genereted_password: '',
      understand: false,
      saved_password: false
    }
  });

  useEffect(() => {
    form.setValue('name', username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function onSubmit(_data: AccountFormValues) {
    setLoading(true);
    try {
      const components = await resolveChangePasswordComponents(_data.curr_password);
      await changePasswordMutation.mutateAsync({ ...components });
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
    newOwner: string;
    newActive: string;
    newPosting: string;
    wif: string;
  }> {
    const isWif = password.startsWith('5') && password.length === 51;
    const wax = await createWaxFoundation();
    let wif = '';

    if (isWif) {
      wif = password;
    } else {
      const privateKey = wax.getPrivateKeyFromPassword(username, 'owner', password);
      wif = privateKey.wifPrivateKey;
    }

    // generate password
    const brainKeyData = wax.suggestBrainKey();
    const passwordToBeSavedByUser = 'P' + brainKeyData.wifPrivateKey;

    // private keys for account authorities
    const newOwner = wax.getPrivateKeyFromPassword(username, 'owner', passwordToBeSavedByUser);
    const newActive = wax.getPrivateKeyFromPassword(username, 'active', passwordToBeSavedByUser);
    const newPosting = wax.getPrivateKeyFromPassword(username, 'posting', passwordToBeSavedByUser);

    return {
      account: username,
      newOwner: newOwner.associatedPublicKey,
      newActive: newActive.associatedPublicKey,
      newPosting: newPosting.associatedPublicKey,
      wif
    };
  }

  async function handleKey() {
    const wax = await createWaxFoundation();
    // generate password
    const brainKeyData = wax.suggestBrainKey();
    const passwordToBeSavedByUser = 'P' + brainKeyData.wifPrivateKey;

    // private keys for account authorities
    const newOwner = wax.getPrivateKeyFromPassword(username, 'owner', passwordToBeSavedByUser);
    const newActive = wax.getPrivateKeyFromPassword(username, 'active', passwordToBeSavedByUser);
    const newPosting = wax.getPrivateKeyFromPassword(username, 'posting', passwordToBeSavedByUser);

    setPublicKeys({
      active: newActive.associatedPublicKey,
      owner: newOwner.associatedPublicKey,
      posting: newPosting.associatedPublicKey
    });

    key = passwordToBeSavedByUser;
    setIsKeyGenerated(true);
  }

  return (
    <ProfileLayout>
      <WalletMenu username={username} />
      <div className="m-auto flex max-w-2xl flex-col gap-4 bg-background p-2 pb-8">
        <div className="text-2xl font-bold">{t('change_password_page.change_password')}</div>
        <Separator />
        <p className="text-sm leading-relaxed text-primary/60">
          {t('change_password_page.the_rules.one')}
          <br />
          {t('change_password_page.the_rules.second')}
          <br />
          {t('change_password_page.the_rules.third')}
          <br />
          {t('change_password_page.the_rules.fourth')}
          <br />
          {t('change_password_page.the_rules.fifth')}
          <br />
          {t('change_password_page.the_rules.sixth')}
          <br />
          {t('change_password_page.the_rules.seventh')}
        </p>
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
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <div className="text-sm font-semibold">
                {t('change_password_page.generated_password')}
                <span className="font-light">({t('change_password_page.new')})</span>
              </div>
              {isKeyGenerated ? (
                <div>
                  <code className="my-1 block bg-background px-1 py-2 text-center text-destructive">
                    {key}
                  </code>
                  <div className="text-center text-xs font-bold">
                    {t('change_password_page.backup_password_by_storing_it')}
                  </div>
                </div>
              ) : (
                <Button
                  className="my-1"
                  variant="outlineRed"
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
              name="understand"
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
            />{' '}
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
            <Button type="submit" variant="redHover" disabled={loading || !form.formState.isValid} className='w-[164px] flex justify-center'>
              {loading ? <Icons.spinner className="h-4 w-4 animate-spin" /> : t('change_password_page.update_password')}
            </Button>
          </form>
        </Form>
      </div>
    </ProfileLayout>
  );
}
