import { Button } from '@ui/components/button';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { transactionService } from '@transaction/index';
import { User } from '@smart-signer/types/common';

const SubscribeCommunity = ({
  user,
  username,
  subStatus,
  OnIsSubscribe
}: {
  user: User;
  username: string;
  subStatus: Boolean;
  OnIsSubscribe: (e: boolean) => void;
}) => {
  const { t } = useTranslation('common_blog');

  return (
    <>
      {user && user.isLoggedIn ? (
        <>
          {!subStatus ? (
            <Button
              size="sm"
              className="w-full bg-blue-800 text-center hover:bg-blue-900"
              data-testid="community-subscribe-button"
              onClick={() => {
                const nextIsSubscribe = !subStatus;
                OnIsSubscribe(nextIsSubscribe);
                if (nextIsSubscribe) {
                  transactionService.subscribe(username);
                } else {
                  transactionService.unsubscribe(username);
                }
              }}
            >
              {t('communities.buttons.subscribe')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="group relative w-full text-center text-blue-800 hover:border-red-500 hover:text-red-500"
              onClick={() => {
                const nextIsSubscribe = !subStatus;
                OnIsSubscribe(nextIsSubscribe);
                transactionService.unsubscribe(username);
              }}
            >
              <span className="group-hover:hidden">{t('communities.buttons.joined')}</span>
              <span className="hidden group-hover:inline">{t('communities.buttons.leave')}</span>
            </Button>
          )}
        </>
      ) : (
        <DialogLogin>
          <Button
            size="sm"
            className="w-full bg-blue-800 text-center hover:bg-blue-900"
            data-testid="community-subscribe-button"
          >
            {t('communities.buttons.subscribe')}
          </Button>
        </DialogLogin>
      )}
    </>
  );
};

export default SubscribeCommunity;
