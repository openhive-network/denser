import React, { useState, useEffect } from 'react';
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
import { Authority } from '@hiveio/dhive/lib/chain/account';
import AuthoritesGroup from '@/wallet/components/authorities-group';
import { useUser } from '@smart-signer/lib/auth/use-user';

export interface AuthoritiesProps {
  memo_key: string;
  json_metadata: string;
  owner: Authority;
  active: Authority;
  posting: Authority;
}

export default function EditableTable({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { user } = useUser();
  const accountOwner = user?.username === username;
  const { t } = useTranslation('common_wallet');
  const { data: accountData, isLoading: accountLoading } = useQuery(
    ['accountData', username],
    () => getAccount(username),
    {
      enabled: Boolean(username)
    }
  );
  const profileAuthorities: AuthoritiesProps = {
    memo_key: accountData?.memo_key || '',
    json_metadata: accountData?.json_metadata || '',
    owner: {
      weight_threshold: accountData?.owner?.weight_threshold || 1,
      account_auths: accountData?.owner?.account_auths || [],
      key_auths: accountData?.owner?.key_auths || []
    },
    active: {
      weight_threshold: accountData?.active?.weight_threshold || 1,
      account_auths: accountData?.active?.account_auths || [],
      key_auths: accountData?.active?.key_auths || []
    },
    posting: {
      weight_threshold: accountData?.posting.weight_threshold || 1,
      account_auths: accountData?.posting?.account_auths || [],
      key_auths: accountData?.posting?.key_auths || []
    }
  };

  const [data, setData] = useState<AuthoritiesProps>(profileAuthorities);
  useEffect(() => {
    setData(profileAuthorities);
  }, [accountLoading]);

  const updateProfileMutation = useUpdateProfileMutation();
  if (accountLoading) {
    return (
      <ProfileLayout>
        <Loading loading />;
      </ProfileLayout>
    );
  }
  if (!data || !setData) return null;
  const onSubmit = () => {
    updateProfileMutation.mutate({
      memo_key: data.memo_key,
      json_metadata: data.json_metadata,
      owner: data.owner,
      active: data.active,
      posting: data.posting
    });
  };

  return (
    <ProfileLayout>
      <WalletMenu username={username} />
      <div className="flex flex-col gap-8 p-6">
        <AuthoritesGroup
          editable={accountOwner}
          id="posting"
          threshold={data.posting.weight_threshold}
          label="Posting Authorities"
          users={data.posting.account_auths.map(([label, threshold]) => ({
            id: label,
            type: 'USER',
            label,
            threshold
          }))}
          keys={data.posting.key_auths.map(([label, threshold]) => ({
            id: label.toString(),
            type: 'KEY',
            label: label.toString(),
            threshold
          }))}
          handlerUpdateData={setData}
        />
        <AuthoritesGroup
          editable={accountOwner}
          id="active"
          threshold={data.active.weight_threshold}
          label="Active Authorities"
          users={
            data.active.account_auths.map(([label, threshold]) => ({
              id: label,
              type: 'USER',
              label,
              threshold
            })) || []
          }
          keys={
            data.active.key_auths.map(([label, threshold]) => ({
              id: label.toString(),
              type: 'KEY',
              label: label.toString(),
              threshold
            })) || []
          }
          handlerUpdateData={setData}
        />
        <AuthoritesGroup
          editable={accountOwner}
          id="owner"
          threshold={data.owner.weight_threshold}
          label="Owner Authorities"
          users={
            data.owner.account_auths.map(([label, threshold]) => ({
              id: label,
              type: 'USER',
              label,
              threshold
            })) || []
          }
          keys={
            data.owner.key_auths.map(([label, threshold]) => ({
              id: label.toString(),
              type: 'KEY',
              label: label.toString(),
              threshold
            })) || []
          }
          handlerUpdateData={setData}
        />
        {accountOwner ? (
          <Button disabled={updateProfileMutation.isLoading} onClick={onSubmit} className="w-fit self-end">
            {updateProfileMutation.isLoading ? (
              <Loading loading={updateProfileMutation.isLoading} />
            ) : (
              'Save Changes'
            )}
          </Button>
        ) : null}
      </div>
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
