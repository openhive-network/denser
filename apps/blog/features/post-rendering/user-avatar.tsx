import clsx from 'clsx';
import Image from 'next/image';
import { getUserAvatarUrlCDN } from '@hive/ui';

interface Props {
  username: string;
  size: string;
  className?: string;
}

/**
 * UserAvatar component displays user profile picture.
 * Uses CDN URL (images.hive.blog) for optimal caching and Next.js Image optimization.
 */
function UserAvatar({ username, size, className }: Props) {
  const imgSize = size === 'xLarge' ? 'large' : size === 'normal' || size === 'small' ? 'small' : 'medium';
  // Use CDN URL for better performance and caching
  const imageSrc = getUserAvatarUrlCDN(username, imgSize as 'small' | 'medium' | 'large');

  return (
    <span
      className={clsx(
        'relative mr-2 block h-12 w-12 overflow-hidden rounded-full bg-transparent',
        className
      )}
    >
      <Image
        src={imageSrc}
        alt={`${username}'s avatar`}
        fill
        sizes="48px"
        className="object-cover"
      />
    </span>
  );
}

export default UserAvatar;
