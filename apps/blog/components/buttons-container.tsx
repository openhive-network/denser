import { IFollow } from '@transaction/lib/hive';
import FollowButton from './follow-button';
import MuteButton from './mute-button';
import { User } from '@smart-signer/types/common';
import { UseInfiniteQueryResult } from '@tanstack/react-query';

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
  return (
    <>
      <FollowButton username={username} user={user} variant={variant} list={follow} />
      {user.isLoggedIn ? <MuteButton username={username} user={user} variant={variant} list={mute} /> : null}
    </>
  );
};

export default ButtonsContainer;
