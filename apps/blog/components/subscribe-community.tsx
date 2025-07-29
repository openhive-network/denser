import { Button } from '@ui/components/button';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { User } from '@smart-signer/types/common';
import { useSubscribeMutation, useUnsubscribeMutation } from './hooks/use-subscribe-mutations';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const SubscribeCommunity = ({
  user,
  community,
  isSubscribed,
  onIsSubscribed,
  communityTitle,
  temprary
}: {
  user: User;
  community: string;
  isSubscribed: Boolean;
  onIsSubscribed: (e: boolean) => void;
  communityTitle: string;
  temprary?: boolean;
}) => {
  const { t } = useTranslation('common_blog');
  const subscribeMutation = useSubscribeMutation();
  const unsubscribeMutation = useUnsubscribeMutation();
  const { username } = user;

  return (
    <>
      {user && user.isLoggedIn ? (
        <>
          {!isSubscribed ? (
            <Button
              size="sm"
              className="w-full bg-blue-600 text-center text-slate-50 hover:bg-blue-700"
              data-testid="community-subscribe-button"
              disabled={subscribeMutation.isLoading || temprary}
              onClick={async () => {
                try {
                  await subscribeMutation.mutateAsync({ community, username, communityTitle });
                  onIsSubscribed(true);
                } catch (error) {
                  handleError(error, {
                    method: 'subscribe',
                    params: { community, username, communityTitle }
                  });
                }
              }}
            >
              {subscribeMutation.isLoading ? (
                <CircleSpinner loading={subscribeMutation.isLoading} size={18} color="#dc2626" />
              ) : (
                t('communities.buttons.subscribe')
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="group relative w-full border-blue-600 text-center text-blue-600 hover:border-destructive hover:bg-transparent hover:text-destructive"
              data-testid="community-join-leave-button"
              disabled={unsubscribeMutation.isLoading || temprary}
              onClick={async () => {
                try {
                  await unsubscribeMutation.mutateAsync({ community, username });
                  onIsSubscribed(false);
                } catch (error) {
                  handleError(error, { method: 'unsubscribe', params: { community, username } });
                }
              }}
            >
              {unsubscribeMutation.isLoading ? (
                <CircleSpinner loading={unsubscribeMutation.isLoading} size={18} color="#dc2626" />
              ) : (
                <span>
                  <span className="group-hover:hidden">{t('communities.buttons.joined')}</span>
                  <span className="hidden group-hover:inline">{t('communities.buttons.leave')}</span>
                </span>
              )}
            </Button>
          )}
        </>
      ) : (
        <DialogLogin>
          <Button
            size="sm"
            className="w-full bg-blue-600 text-center text-slate-50 hover:bg-blue-700"
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
