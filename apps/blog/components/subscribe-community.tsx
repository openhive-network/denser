import { Button } from '@ui/components/button';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { User } from '@smart-signer/types/common';
import { useSubscribeMutation, useUnsubscribeMutation } from './hooks/use-subscribe-mutations';
import { handleError } from '@ui/lib/utils';
import { CircleSpinner } from 'react-spinners-kit';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const SubscribeCommunity = ({
  user,
  username,
  isSubscribed,
  onIsSubscribed
}: {
  user: User;
  username: string;
  isSubscribed: Boolean;
  onIsSubscribed: (e: boolean) => void;
}) => {
  const { t } = useTranslation('common_blog');
  const subscribeMutation = useSubscribeMutation();
  const unsubscribeMutation = useUnsubscribeMutation();

  return (
    <>
      {user && user.isLoggedIn ? (
        <>
          {!isSubscribed ? (
            <Button
              size="sm"
              className="w-full bg-blue-800 text-center hover:bg-blue-900"
              data-testid="community-subscribe-button"
              disabled={subscribeMutation.isLoading}
              onClick={async () => {
                logger.info('doing subscribe');
                try {
                  logger.info('doing subscribe');
                  await subscribeMutation.mutateAsync({ username });
                  onIsSubscribed(true);
                } catch (error) {
                  handleError(error, { method: 'subscribe', params: { username } });
                }
              }}
            >
              {subscribeMutation.isLoading
              ?
                <CircleSpinner
                  loading={subscribeMutation.isLoading}
                  size={18}
                  color="#dc2626"
                />
              :
                t('communities.buttons.subscribe')
              }
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="group relative w-full text-center text-blue-800 hover:border-red-500 hover:text-red-500"
              disabled={unsubscribeMutation.isLoading}
              onClick={async () => {
                logger.info('doing unsubscribe');
                try {
                  await unsubscribeMutation.mutateAsync({ username });
                  onIsSubscribed(false);
                } catch (error) {
                  handleError(error, { method: 'unsubscribe', params: { username } });
                }
              }}
            >
              {unsubscribeMutation.isLoading
              ?
                <CircleSpinner
                  loading={unsubscribeMutation.isLoading}
                  size={18}
                  color="#dc2626"
                />
              :
                <span>
                  <span className="group-hover:hidden">{t('communities.buttons.joined')}</span>
                  <span className="hidden group-hover:inline">{t('communities.buttons.leave')}</span>
                </span>
              }
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
