import React, { useEffect, useState } from 'react';
import { Button } from '@hive/ui';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { transactionService } from '@transaction/index';
import { useSigner } from '@smart-signer/lib/use-signer';
import { User } from '@smart-signer/types/common';
import { IFollow } from '@transaction/lib/hive';
import { UseInfiniteQueryResult } from '@tanstack/react-query';

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
  const { signerOptions } = useSigner();
  const { t } = useTranslation('common_blog');
  const [isFollow, setIsFollow] = useState(false);

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
          onClick={() => {
            const nextFollow = !isFollow;
            setIsFollow(nextFollow);
            if (nextFollow) {
              transactionService.follow(username, user, signerOptions);
            } else {
              transactionService.unfollow(username, user, signerOptions);
            }
          }}
          disabled={list.isLoading || list.isFetching}
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
