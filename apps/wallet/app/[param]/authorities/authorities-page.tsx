'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import Loading from '@ui/components/loading';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Accordion, Button } from '@ui/components';
import useWindowSize from '@/wallet/components/hooks/use-window-size';
import AuthoritesGroup from '@/wallet/components/authorities-group';
import MemoAccordionItem from '@/wallet/components/memo-accordion-item';
import { Icons } from '@ui/components/icons';
import { toast } from '@ui/components/hooks/use-toast';
import { useAuthorityOperations } from '@/wallet/components/hooks/use-authority-operation';
import WalletMenu from '@/wallet/components/wallet-menu';

export default function AuthoritiesPage({ username }: { username: string }) {
  const { user } = useUserClient();
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
    return <Loading loading />;
  }
  if (!operationsData || authorityLevels.length === 0 || !memo) {
    return <div>No data</div>;
  }
  return (
    <>
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
              <Icons.spinner className="h-[18px] w-[18px] animate-spin text-red-600" />
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
    </>
  );
}
