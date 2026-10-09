import clsx from 'clsx';
import { getUserAvatarUrl, UserAvatarImg } from '@hive/ui';

interface Props {
  username: string;
  size: string;
  className?: string;
}

function UserAvatar({ username, size, className }: Props) {
  const imgSize = size === 'xLarge' ? 'large' : size === 'normal' || size === 'small' ? 'small' : 'medium';
  const imageSrc = getUserAvatarUrl(username, imgSize as 'small' | 'medium' | 'large');

  return (
    <UserAvatarImg
      className={clsx('mr-2 block h-12 w-12 rounded-full bg-transparent object-cover object-center', className)}
      src={imageSrc}
      alt=""
      fetchPriority="low"
      data-testid="user-avatar"
    />
  );
}

export default UserAvatar;
