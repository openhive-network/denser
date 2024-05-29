import { Button } from '@ui/components/button';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { transactionService } from '@transaction/index';
import { User } from '@smart-signer/types/common';
import { useSubscribeMutation, useUnsubscribeMutation } from './hooks/use-subscribe-mutations';
import { handleError } from '@ui/lib/utils';

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
  const { subscribe } = useSubscribeMutation();
  const { unsubscribe } = useUnsubscribeMutation();

  return (
    <>
      {user && user.isLoggedIn ? (
        <>
          {!subStatus ? (
            <Button
              size="sm"
              className="w-full bg-blue-800 text-center hover:bg-blue-900"
              data-testid="community-subscribe-button"
              onClick={async () => {
                const nextIsSubscribe = !subStatus;
                OnIsSubscribe(nextIsSubscribe);
                if (nextIsSubscribe) {
                  await subscribe({ username });
                } else {
                  await unsubscribe({ username });
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
                unsubscribe({ username });
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
