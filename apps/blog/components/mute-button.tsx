import React, { use, useEffect, useState } from 'react';
import { Button } from '@hive/ui';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { User } from '@smart-signer/types/common';
import { IFollow } from '@transaction/lib/hive';
import { UseInfiniteQueryResult } from '@tanstack/react-query';
import { useMuteMutation, useUnmuteMutation } from './hooks/use-mute-mutations';
import { handleError } from '@ui/lib/utils';
import { CircleSpinner } from 'react-spinners-kit';

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
  const { t } = useTranslation('common_blog');
  const [isMute, setIsMute] = useState(false);
  const muteMutation = useMuteMutation();
  const unmuteMutation = useUnmuteMutation();
  useEffect(() => {
    if (muteMutation.isSuccess || unmuteMutation.isSuccess) {
      setIsMute((prev) => !prev);
    }
  }, [muteMutation.isSuccess, unmuteMutation.isSuccess]);

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
          onClick={async () => {
            const nextMute = !isMute;
            if (nextMute) {
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
          }}
          disabled={list.isLoading || list.isFetching || muteMutation.isLoading || unmuteMutation.isLoading}
        >
          {muteMutation.isLoading || unmuteMutation.isLoading ? (
            <span className="flex h-5 w-12 items-center justify-center">
              <CircleSpinner
                loading={muteMutation.isLoading || unmuteMutation.isLoading}
                size={18}
                color="#dc2626"
              />
            </span>
          ) : isMute ? (
            t('user_profile.unmute_button')
          ) : (
            t('user_profile.mute_button')
          )}
        </Button>
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
export default MuteButton;
