import React, { useEffect, useState } from 'react';
import { Button } from '@hive/ui';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useFollowingInfiniteQuery } from './hooks/use-following-infinitequery';
import { transactionService } from '@transaction/index';
import { FollowOperationBuilder } from '@hive/wax/web';
import { useSigner } from '@/blog/components/hooks/use-signer';

const FollowButton = ({ username }: { username: string }) => {
  const [isFollow, setIsFollow] = useState(false);
  const { signerOptions } = useSigner();
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const {
    data: followingData,
    isLoading: isLoadingFollowingData,
    isFetching: isFetchingFollowingData
  } = useFollowingInfiniteQuery(user?.username || '', 50, 'blog', ['blog']);
  useEffect(() => {
    const isFollow = Boolean(
      followingData?.pages[0].some((f) => f.follower === user?.username && f.following === username)
    );
    setIsFollow(isFollow);
  }, [followingData?.pages, user?.username, username]);

  return (
    <>
      {user && user.isLoggedIn ? (
        <Button
          className=" hover:text-red-500 "
          variant="secondary"
          size="sm"
          data-testid="profile-follow-button"
          onClick={() => {
            const nextFollow = !isFollow;
            setIsFollow(nextFollow);
            transactionService.processHiveAppOperation((builder) => {
              if (nextFollow) {
                builder.push(
                  new FollowOperationBuilder()
                    .followBlog(user.username, username)
                    .authorize(user.username)
                    .build()
                );
              } else {
                builder.push(
                  new FollowOperationBuilder()
                    .unfollowBlog(user.username, username)
                    .authorize(user.username)
                    .build()
                );
              }
            }, signerOptions);
          }}
          disabled={isLoadingFollowingData || isFetchingFollowingData}
        >
          {isFollow ? t('user_profil.unfollow_button') : t('user_profil.follow_button')}
        </Button>
      ) : (
        <DialogLogin>
          <Button
            className=" hover:text-red-500 "
            variant="secondary"
            size="sm"
            data-testid="profile-follow-button"
          >
            {t('user_profil.follow_button')}
          </Button>
        </DialogLogin>
      )}
    </>
  );
};
export default FollowButton;
