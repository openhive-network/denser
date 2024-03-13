import React, { useEffect, useState } from 'react';
import { Button } from '@hive/ui';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { transactionService } from '@transaction/index';
import { useSigner } from '@smart-signer/lib/use-signer';
import { User } from '@smart-signer/types/common';
import { IFollow } from '@transaction/lib/hive';
import { UseInfiniteQueryResult } from '@tanstack/react-query';

const MuteButton = ({
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
  const [isMute, setIsMute] = useState(false);

  useEffect(() => {
    const isMute = Boolean(
      list.data?.pages[0].some((f) => f.follower === user.username && f.following === username)
    );
    setIsMute(isMute);
  }, [list.data?.pages, user.username, username]);
  return (
    <>
      {user.isLoggedIn ? (
        <Button
          className=" hover:text-red-500"
          variant={variant}
          size="sm"
          data-testid="profile-mute-button"
          onClick={() => {
            const nextMute = !isMute;
            setIsMute(nextMute);
            if (nextMute) {
              transactionService.mute(username, user, signerOptions);
            } else {
              transactionService.unmute(username, user, signerOptions);
            }
          }}
          disabled={list.isLoading || list.isFetching}
        >
          {isMute ? t('user_profil.unmute_button') : t('user_profil.mute_button')}
        </Button>
      ) : (
        <DialogLogin>
          <Button
            className=" hover:text-red-500"
            variant={variant}
            size="sm"
            data-testid="profile-mute-button"
          >
            {t('user_profil.mute_button')}
          </Button>
        </DialogLogin>
      )}
    </>
  );
};
export default MuteButton;
