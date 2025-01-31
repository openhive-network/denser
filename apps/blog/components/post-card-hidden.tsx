import { User } from '@smart-signer/types/common';
import { Badge } from '@ui/components';
import Link from 'next/link';
import { FC } from 'react';

interface PostCardHiddenProps {
  user: User;
  revealPost: () => void;
}

const PostCardHidden = ({ user, revealPost }: PostCardHiddenProps) => {
  return (
    <div>
      <Badge variant="outline" className="mx-1 border-destructive text-destructive">
        nsfw
      </Badge>
      <span className="cursor-pointer text-destructive" onClick={revealPost}>
        Reveal this post
      </span>{' '}
      or{' '}
      {user.isLoggedIn ? (
        <>
          <span>adjust your </span>
          <Link href={`/@${user.username}/settings`} className="cursor-pointer text-destructive">
            display preferences.
          </Link>{' '}
        </>
      ) : (
        <>
          <Link href="https://signup.hive.io/" className="cursor-pointer text-destructive">
            create an account
          </Link>{' '}
          to save your preferences.
        </>
      )}
    </div>
  );
};

export default PostCardHidden;
