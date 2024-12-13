import React, { useEffect, useState } from 'react';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useTranslation } from 'next-i18next';
import { getTranslations } from '../../lib/get-translations';
import WalletMenu from '@/wallet/components/wallet-menu';
import { useQuery } from '@tanstack/react-query';
import { getAccount } from '@transaction/lib/hive';
import { Button } from '@ui/components/button';
import Loading from '@ui/components/loading';
import { useUpdateProfileMutation } from '@/wallet/components/hooks/use-update-wallet-profile-mutation';
import AuthoritesGroup from '@/wallet/components/authorities-group';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Accordion } from '@ui/components/accordion';
import { validation } from '@/wallet/lib/utils';
import { useForm } from 'react-hook-form';
import { Form } from '@ui/components/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleSpinner } from 'react-spinners-kit';
import { handleError } from '@ui/lib/utils';

const authoritiesSchema = z.object({
  weight_threshold: z.number(),
  account_auths: z
    .object({
      account: z.string(),
      threshold: z.number()
    })
    .array(),
  key_auths: z.object({ key: z.string(), threshold: z.number() }).array()
});
export type AuthorityProps = z.infer<typeof authoritiesSchema>;

const authorities = ['posting', 'active', 'owner'] as const;
const formSchema = z.object({
  memo_key: z.string(),
  json_metadata: z.string(),
  ...authorities.reduce(
    (acc, cur) => {
      acc[cur] = authoritiesSchema;
      return acc;
    },
    {} as Record<(typeof authorities)[number], typeof authoritiesSchema>
  )
});
export type AuthoritiesProps = z.infer<typeof formSchema>;

export default function EditableTable({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { user } = useUser();
  const accountOwner = user?.username === username;
  const [editMode, setEditMode] = useState(false);
  const { t } = useTranslation('common_wallet');
  type AuthorityFormValues = z.infer<typeof formSchema>;
  const { data: accountData, isLoading: accountLoading } = useQuery(
    ['walletProfileData', username],
    () => getAccount(username),
    {
      enabled: Boolean(username)
    }
  );
  const updateProfileMutation = useUpdateProfileMutation();
  const [error, setError] = useState<string>('');
  useEffect(() => {
    if (updateProfileMutation.isSuccess && !updateProfileMutation.isError) setEditMode(false);
    if (updateProfileMutation.isError) {
      const errorData = JSON.stringify(updateProfileMutation.error);
      const errorObject = JSON.parse(errorData);

      setError(errorObject.apiError ?? updateProfileMutation.error);
      handleError(updateProfileMutation.error);
    }
  }, [updateProfileMutation.isLoading]);

  const mapAuths = (auths: any) => ({
    weight_threshold: auths?.weight_threshold || 1,
    account_auths:
      auths?.account_auths.map(([account, threshold]: [string, number]) => ({ account, threshold })) || [],
    key_auths:
      auths?.key_auths.map(([key, threshold]: [string, number]) => ({ key: key.toString(), threshold })) || []
  });

  const profileAuthorities: AuthorityFormValues = {
    memo_key: accountData?.memo_key || '',
    json_metadata: accountData?.json_metadata || '',
    owner: mapAuths(accountData?.owner),
    active: mapAuths(accountData?.active),
    posting: mapAuths(accountData?.posting)
  };
  const form = useForm<AuthorityFormValues>({
    resolver: zodResolver(formSchema),
    values: profileAuthorities
  });
  form.watch();

  const values = form.getValues();

  const validators = authorities.reduce(
    (acc, authority) => {
      const validationResult = validation(authority, values[authority], t);
      acc[authority] = validationResult === false ? undefined : validationResult;
      return acc;
    },
    {} as Record<(typeof authorities)[number], string | undefined>
  );

  if (accountLoading) {
    return (
      <ProfileLayout>
        <Loading loading />;
      </ProfileLayout>
    );
  }
  if (!profileAuthorities) return null;

  const onSubmit = (values: AuthorityFormValues) => {
    setError('');
    updateProfileMutation.mutate({
      memo_key: values.memo_key,
      json_metadata: values.json_metadata,
      owner: values.owner,
      active: values.active,
      posting: values.posting
    });
  };

  return (
    <ProfileLayout>
      <WalletMenu username={username} />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8 p-6">
          <>
            <Accordion type="multiple">
              {authorities.map((e) => (
                <AuthoritesGroup
                  key={e}
                  editMode={editMode}
                  id={e}
                  controller={form.control}
                  inputDisabled={updateProfileMutation.isLoading}
                />
              ))}
            </Accordion>
            <div className="flex flex-col gap-4 self-end">
              {user.isLoggedIn && accountOwner && !editMode ? (
                <Button
                  onClick={() => setEditMode((prev) => !prev)}
                  variant="redHover"
                  className="flex gap-4 self-end"
                >
                  {t('authorities_page.edit')}
                </Button>
              ) : editMode ? (
                <div className="flex gap-4 self-end">
                  <Button
                    type="button"
                    variant="outlineRed"
                    onClick={() => {
                      setError('');
                      form.reset();
                      setEditMode(() => false);
                    }}
                    disabled={
                      updateProfileMutation.isLoading ||
                      !!validators[authorities.find((e) => !!validators[e]) as (typeof authorities)[number]]
                    }
                  >
                    {t('authorities_page.cancel')}
                  </Button>
                  <Button
                    variant="redHover"
                    type="submit"
                    disabled={
                      updateProfileMutation.isLoading ||
                      !!validators[authorities.find((e) => !!validators[e]) as (typeof authorities)[number]]
                    }
                  >
                    {updateProfileMutation.isLoading ? (
                      <CircleSpinner loading={updateProfileMutation.isLoading} size={18} color="#dc2626" />
                    ) : (
                      t('authorities_page.save_changes')
                    )}
                  </Button>
                </div>
              ) : null}
              {(authorities.some((e) => !!validators[e]) || !!error) && (
                <div className="text-sm text-destructive">
                  {validators[authorities.find((e) => !!validators[e]) as (typeof authorities)[number]] ||
                    (error as any).message}
                </div>
              )}
            </div>
          </>
        </form>
      </Form>
    </ProfileLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const username = ctx.params?.param as string;

  if (username[0] !== '@') {
    return {
      notFound: true
    };
  }

  return {
    props: {
      username: username.replace('@', ''),
      ...(await getTranslations(ctx))
    }
  };
};