import React, { useState } from 'react';
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

export type AuthorityProps = {
  weight_threshold: number;
  account_auths: { account: string; threshold: number }[];
  key_auths: { key: string; threshold: number }[];
};

export interface AuthoritiesProps {
  memo_key: string;
  json_metadata: string;
  owner: AuthorityProps;
  active: AuthorityProps;
  posting: AuthorityProps;
}

const accountSchema = z.object({ account: z.string(), threshold: z.number() });
const keySchema = z.object({ key: z.string(), threshold: z.number() });
const formSchema = z.object({
  memo_key: z.string(),
  json_metadata: z.string(),
  owner: z.object({
    weight_threshold: z.number(),
    account_auths: z.array(accountSchema),
    key_auths: z.array(keySchema)
  }),
  active: z.object({
    weight_threshold: z.number(),
    account_auths: z.array(accountSchema),
    key_auths: z.array(keySchema)
  }),
  posting: z.object({
    weight_threshold: z.number(),
    account_auths: z.array(accountSchema),
    key_auths: z.array(keySchema)
  })
});
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
  const profileAuthorities: AuthorityFormValues = {
    memo_key: accountData?.memo_key || '',
    json_metadata: accountData?.json_metadata || '',
    owner: {
      weight_threshold: accountData?.owner?.weight_threshold || 1,
      account_auths:
        accountData?.owner?.account_auths.map(([account, threshold]) => ({ account, threshold })) || [],
      key_auths:
        accountData?.owner?.key_auths.map(([key, threshold]) => ({ key: key.toString(), threshold })) || []
    },
    active: {
      weight_threshold: accountData?.active?.weight_threshold || 1,
      account_auths:
        accountData?.active?.account_auths.map(([account, threshold]: [string, number]) => ({
          account,
          threshold
        })) || [],
      key_auths:
        accountData?.active?.key_auths.map(([key, threshold]) => ({ key: key.toString(), threshold })) || []
    },
    posting: {
      weight_threshold: accountData?.posting.weight_threshold || 1,
      account_auths:
        accountData?.posting?.account_auths.map(([account, threshold]: [string, number]) => ({
          account,
          threshold
        })) || [],
      key_auths:
        accountData?.posting?.key_auths.map(([key, threshold]) => ({ key: key.toString(), threshold })) || []
    }
  };

  const form = useForm<AuthorityFormValues>({
    resolver: zodResolver(formSchema),
    values: profileAuthorities
  });
  form.watch();

  const values = form.getValues();
  const validatorThresholdPosting = validation('posting', values.posting);
  const validatorThresholdActive = validation('active', values.active);
  const validatorThresholdOwner = validation('owner', values.owner);

  const updateProfileMutation = useUpdateProfileMutation();
  if (accountLoading) {
    return (
      <ProfileLayout>
        <Loading loading />;
      </ProfileLayout>
    );
  }
  if (!profileAuthorities) return null;

  const onSubmit = (values: AuthorityFormValues) => {
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
              <AuthoritesGroup editMode={editMode} id="posting" controller={form.control} />
              <AuthoritesGroup editMode={editMode} id="active" controller={form.control} />
              <AuthoritesGroup editMode={editMode} id="owner" controller={form.control} />
            </Accordion>
            <div className="flex flex-col gap-4 self-end">
              {accountOwner && !editMode ? (
                <Button onClick={() => setEditMode((prev) => !prev)} variant="redHover">
                  Edit
                </Button>
              ) : editMode ? (
                <div className="flex gap-4 self-end">
                  <Button
                    variant="outlineRed"
                    onClick={() => {
                      form.reset();
                      setEditMode(() => false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="redHover"
                    type="submit"
                    disabled={
                      updateProfileMutation.isLoading ||
                      !!validatorThresholdPosting ||
                      !!validatorThresholdActive ||
                      !!validatorThresholdOwner
                    }
                  >
                    {updateProfileMutation.isLoading ? (
                      <Loading loading={updateProfileMutation.isLoading} />
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              ) : null}
              {(validatorThresholdPosting || validatorThresholdActive || validatorThresholdOwner) && (
                <div className="text-sm text-destructive">
                  {validatorThresholdPosting || validatorThresholdActive || validatorThresholdOwner}
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
