import React from 'react';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useTranslation } from 'next-i18next';
import { getTranslations } from '../../lib/get-translations';
import WalletMenu from '@/wallet/components/wallet-menu';
import { useQuery } from '@tanstack/react-query';
import { getAuthority } from '@transaction/lib/hive';
import Loading from '@ui/components/loading';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Accordion } from '@ui/components';
import useWindowSize from '@/wallet/components/hooks/use-window-size';
import AuthoritesGroup from '@/wallet/components/authorities-group';
import MemoAccordionItem from '@/wallet/components/memo-accordion-item';

export default function EditableTable({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { user } = useUser();
  const { t } = useTranslation('common_wallet');
  const { data, isLoading } = useQuery(['authority', username], () => getAuthority(username), {
    enabled: !!username
  });
  const { width } = useWindowSize();
  const accountOwner = user.isLoggedIn && user?.username === username;
  if (isLoading) {
    return (
      <ProfileLayout>
        <Loading loading />;
      </ProfileLayout>
    );
  }
  if (!data) return <div>No data</div>;
  return (
    <ProfileLayout>
      <WalletMenu username={username} />
      <div className="flex flex-col gap-8 p-6">
        <Accordion type="multiple">
          <MemoAccordionItem memo={data.memo} width={width} canEdit={accountOwner} />
          {data.authorityLevels.length === 0
            ? null
            : data.authorityLevels.map((e, i) => (
                <AuthoritesGroup data={e} width={width} key={i} canEdit={accountOwner} />
              ))}
        </Accordion>
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
