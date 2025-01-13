import React, { useEffect, useState } from 'react';
import ProfileLayout from '@/wallet/components/common/profile-layout';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useTranslation } from 'next-i18next';
import { getTranslations } from '../../lib/get-translations';
import WalletMenu from '@/wallet/components/wallet-menu';
import Loading from '@ui/components/loading';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Accordion, Button } from '@ui/components';
import useWindowSize from '@/wallet/components/hooks/use-window-size';
import AuthoritesGroup from '@/wallet/components/authorities-group';
import MemoAccordionItem from '@/wallet/components/memo-accordion-item';
import { CircleSpinner } from 'react-spinners-kit';
import { toast } from '@ui/components/hooks/use-toast';
import { useAuthorityOperations } from '@/wallet/components/hooks/use-authority-operation';

export default function AuthoritesPage({ username }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { user } = useUser();
  const { t } = useTranslation('common_wallet');
  const {
    state: {
      data: { memo, authorityLevels },
      operations: operationsData
    },
    actions: authoritiesAction,
    isLoading,
    isSubmitting,
    handleSubmit,
    error,
    submitSuccess
  } = useAuthorityOperations(username);

  const [openState, setOpenState] = useState<string[]>([]);
  const { width } = useWindowSize();
  const accountOwner = user.isLoggedIn && user?.username === username;

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive'
      });
    }
  }, [JSON.stringify(error)]);
  useEffect(() => {
    if (submitSuccess) {
      toast({
        title: t('authorities_page.authority_updated'),
        variant: 'success'
      });
    }
  }, [isSubmitting]);

  if (isLoading) {
    return (
      <ProfileLayout>
        <Loading loading />;
      </ProfileLayout>
    );
  }
  if (!operationsData || authorityLevels.length === 0 || !memo) {
    return (
      <ProfileLayout>
        <div>No data</div>
      </ProfileLayout>
    );
  }
  return (
    <ProfileLayout>
      <WalletMenu username={username} />
      <div className="flex flex-col gap-8 p-6">
        {accountOwner ? (
          <Button
            variant="redHover"
            className="mx-8 w-fit self-end"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircleSpinner size={18} color="#dc2626" />
            ) : (
              t('authorities_page.update_authority')
            )}
          </Button>
        ) : null}
        <Accordion type="multiple" value={openState} onValueChange={setOpenState}>
          <MemoAccordionItem
            authoritiesActions={authoritiesAction}
            authorityUpdated={submitSuccess}
            memo={memo}
            width={width}
            canEdit={accountOwner}
            isDisabled={isSubmitting}
            accordionControl={setOpenState}
          />
          {authorityLevels.map((e, i) => (
            <AuthoritesGroup
              data={e}
              width={width}
              key={i}
              isDisabled={isSubmitting}
              authorityUpdated={submitSuccess}
              canEdit={accountOwner}
              accordionControl={setOpenState}
              authoritiesActions={authoritiesAction}
            />
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
