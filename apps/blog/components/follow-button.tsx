import React, { useEffect, useState } from 'react';
import { Button } from '@hive/ui';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { useFollowingInfiniteQuery } from './hooks/use-following-infinitequery';
import { transactionService } from '@transaction/index';
import { FollowOperationBuilder } from '@hive/wax/web';
import { useSigner } from '@/blog/components/hooks/use-signer';
import { User } from '@smart-signer/types/common';

const FollowButton = ({
  username,
  user,
  variant
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
}) => {
  const [isFollow, setIsFollow] = useState(false);
  const { signerOptions } = useSigner();
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
          variant={variant}
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
            variant={variant}
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
