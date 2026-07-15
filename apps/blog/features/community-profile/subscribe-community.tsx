import { Button } from '@ui/components/button';
import DialogLogin from '@/blog/components/dialog-login';
import { useTranslation } from '@/blog/i18n/client';
import { User } from '@smart-signer/types/common';
import { useSubscribeMutation, useUnsubscribeMutation } from './hooks/use-subscribe-mutations';
import { handleError } from '@ui/lib/handle-error';
import { Icons } from '@ui/components/icons';

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
                <Icons.spinner className="h-[18px] w-[18px] animate-spin text-red-600" />
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
                <Icons.spinner className="h-[18px] w-[18px] animate-spin text-red-600" />
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
