import React, { useEffect, useState } from 'react';
import { Button } from '@hive/ui';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { User } from '@smart-signer/types/common';
import { IFollow } from '@transaction/lib/hive';
import { UseInfiniteQueryResult } from '@tanstack/react-query';
import { useFollowMutation, useUnfollowMutation } from './hooks/use-follow-mutations';
import { handleError } from '@ui/lib/utils';
import { CircleSpinner } from 'react-spinners-kit';

const FollowButton = ({
  username,
  user,
  variant,
  list
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
  list: UseInfiniteQueryResult<IFollow[], unknown>;
}) => {
  const { t } = useTranslation('common_blog');
  const [isFollow, setIsFollow] = useState(false);
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  useEffect(() => {
    if (followMutation.isSuccess || unfollowMutation.isSuccess) {
      setIsFollow((prev) => !prev);
    }
  }, [followMutation.isSuccess, unfollowMutation.isSuccess]);

  useEffect(() => {
    const isFollow = Boolean(
      list.data?.pages[0].some(
        (f: { follower: string; following: string }) =>
          f.follower === user.username && f.following === username
      )
    );
    setIsFollow(isFollow);
  }, [list.data?.pages, user?.username, username]);

  return (
    <>
      {user.isLoggedIn ? (
        <Button
          className=" hover:text-red-500 "
          variant={variant}
          size="sm"
          data-testid="profile-follow-button"
          onClick={async () => {
            const nextFollow = !isFollow;
            if (nextFollow) {
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
          }}
          disabled={
            list.isLoading || list.isFetching || followMutation.isLoading || unfollowMutation.isLoading
          }
        >
          {followMutation.isLoading || unfollowMutation.isLoading ? (
            <span className="flex h-5 w-12 items-center justify-center">
              <CircleSpinner
                loading={followMutation.isLoading || unfollowMutation.isLoading}
                size={18}
                color="#dc2626"
              />
            </span>
          ) : isFollow ? (
            t('user_profile.unfollow_button')
          ) : (
            t('user_profile.follow_button')
          )}
        </Button>
      ) : (
        <DialogLogin>
          <Button
            className=" hover:text-red-500 "
            variant={variant}
            size="sm"
            data-testid="profile-follow-button"
          >
            {t('user_profile.follow_button')}
          </Button>
        </DialogLogin>
      )}
    </>
  );
};
export default FollowButton;
