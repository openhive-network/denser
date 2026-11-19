'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';
import Loading from '@ui/components/loading';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Accordion, Button } from '@ui/components';
import useWindowSize from '@/wallet/components/hooks/use-window-size';
import AuthoritesGroup from '@/wallet/components/authorities-group';
import MemoAccordionItem from '@/wallet/components/memo-accordion-item';
import AuthorityLockoutDialog from '@/wallet/components/authority-lockout-dialog';
import AuthorityProblems from '@/wallet/components/authority-problems';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { toast } from '@ui/components/hooks/use-toast';
import { useAuthorityOperations } from '@/wallet/components/hooks/use-authority-operation';
import { useKeyMarks } from '@/wallet/components/hooks/use-key-marks';
import { useGuardedAuthoritySubmit } from '@/wallet/components/hooks/use-guarded-authority-submit';
import WalletMenu from '@/wallet/components/wallet-menu';
import { isOwnAccount } from '@/wallet/lib/account-keys';

export default function AuthoritiesPage({ username }: { username: string }) {
  const { user } = useUserClient();
  const { t } = useTranslation('common_wallet');
  const {
    state: {
      data: { memo, authorityLevels },
      initial,
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
  const accountOwner = isOwnAccount(user, username);
  // Marked from the chain's authorities: a key added in the edit is not yet one any signer holds
  const marks = useKeyMarks(user, username, initial.authorityLevels);
  const { problems, risks, requestSubmit, confirmSubmit, cancelSubmit } = useGuardedAuthoritySubmit({
    user,
    username,
    initial: initial.authorityLevels,
    current: authorityLevels,
    marks,
    submit: handleSubmit,
    submitSuccess
  });

  useEffect(() => {
    if (error) {
      toast({
        title: t('authorities_page.errors.title'),
        description: t(error.key, error.values),
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
    return <div>{t('authorities_page.no_data')}</div>;
  }
  return (
    <>
      <WalletMenu username={username} />
      <div className="flex flex-col gap-8 p-6">
        {accountOwner ? (
          <div className="mx-8 flex flex-col items-end gap-2">
            <AuthorityProblems problems={problems} />
            <Button
              variant="redHover"
              className="w-fit"
              onClick={requestSubmit}
              disabled={isSubmitting || problems.length > 0}
            >
              {isSubmitting ? (
                <CircleSpinner size={18} color="#dc2626" />
              ) : (
                t('authorities_page.update_authority')
              )}
            </Button>
          </div>
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
              marks={marks}
            />
          ))}
        </Accordion>
      </div>
      <AuthorityLockoutDialog
        risks={risks}
        loginType={user.loginType}
        onConfirm={confirmSubmit}
        onCancel={cancelSubmit}
      />
    </>
  );
}
