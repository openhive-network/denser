import { IFollow } from '@transaction/lib/hive';
import FollowButton from './follow-button';
import MuteButton from './mute-button';
import { User } from '@smart-signer/types/common';
import { UseInfiniteQueryResult } from '@tanstack/react-query';
import { useMuteMutation, useUnmuteMutation } from './hooks/use-mute-mutations';
import { useFollowMutation, useUnfollowMutation } from './hooks/use-follow-mutations';
import { Button } from '@hive/ui';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { handleError } from '@ui/lib/utils';

const ButtonsContainer = ({
  username,
  user,
  variant,
  follow,
  mute
}: {
  username: string;
  user: User;
  variant:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'outlineRed'
    | 'link'
    | 'redHover'
    | 'basic'
    | null
    | undefined;
  follow: UseInfiniteQueryResult<IFollow[], unknown>;
  mute: UseInfiniteQueryResult<IFollow[], unknown>;
}) => {
  const { t } = useTranslation('common_blog');

  const muteMutation = useMuteMutation();
  const unmuteMutation = useUnmuteMutation();
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();

  const isMute = Boolean(
    mute.data?.pages[0].some((f) => f.follower === user.username && f.following === username)
  );
  const isFollow = Boolean(
    follow.data?.pages[0].some(
      (f: { follower: string; following: string }) => f.follower === user.username && f.following === username
    )
  );
  const handlerMute = async () => {
    if (!isMute) {
      try {
        await muteMutation.mutateAsync({ username });
      } catch (error) {
        handleError(error, { method: 'mute', params: { username } });
      }
    } else {
      try {
        await unmuteMutation.mutateAsync({ username });
      } catch (error) {
        handleError(error, { method: 'unmute', params: { username } });
      }
    }
  };
  const handlerFollow = async () => {
    if (!isFollow) {
      try {
        await followMutation.mutateAsync({ username });
      } catch (error) {
        handleError(error, { method: 'follow', params: { username } });
      }
    } else {
      try {
        await unfollowMutation.mutateAsync({ username });
      } catch (error) {
        handleError(error, { method: 'unfollow', params: { username } });
      }
    }
  };

  const loading =
    mute.isLoading ||
    mute.isFetching ||
    muteMutation.isLoading ||
    unmuteMutation.isLoading ||
    follow.isLoading ||
    follow.isFetching ||
    followMutation.isLoading ||
    unfollowMutation.isLoading;
  return (
    <>
      {user.isLoggedIn ? (
        <>
          <FollowButton loading={loading} variant={variant} isFollow={isFollow} onClick={handlerFollow} />
          <MuteButton loading={loading} variant={variant} isMute={isMute} onClick={handlerMute} />
        </>
      ) : (
        <DialogLogin>
          <Button
            className=" hover:text-red-500"
            variant={variant}
            size="sm"
            data-testid="profile-mute-button"
          >
            {t('user_profile.mute_button')}
          </Button>
        </DialogLogin>
      )}
    </>
  );
};

export default ButtonsContainer;
