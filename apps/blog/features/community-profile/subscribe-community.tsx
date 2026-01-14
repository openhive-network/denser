import { Button } from '@ui/components/button';
import DialogLogin from '@/blog/components/dialog-login';
import { useTranslation } from '@/blog/i18n/client';
import { User } from '@smart-signer/types/common';
import { useSubscribeMutation, useUnsubscribeMutation } from './hooks/use-subscribe-mutations';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';

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
              className="w-full bg-brand text-center text-brand-foreground hover:bg-brand/90"
              data-testid="community-subscribe-button"
              disabled={subscribeMutation.isPending || temprary}
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
              {subscribeMutation.isPending ? (
                <CircleSpinner loading={subscribeMutation.isPending} size={18} color="#dc2626" />
              ) : (
                t('communities.buttons.subscribe')
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="group relative w-full border-brand text-center text-brand hover:border-destructive hover:bg-transparent hover:text-destructive"
              data-testid="community-join-leave-button"
              disabled={unsubscribeMutation.isPending || temprary}
              onClick={async () => {
                try {
                  await unsubscribeMutation.mutateAsync({ community, username });
                  onIsSubscribed(false);
                } catch (error) {
                  handleError(error, { method: 'unsubscribe', params: { community, username } });
                }
              }}
            >
              {unsubscribeMutation.isPending ? (
                <CircleSpinner loading={unsubscribeMutation.isPending} size={18} color="#dc2626" />
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
            className="w-full bg-brand text-center text-brand-foreground hover:bg-brand/90"
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
