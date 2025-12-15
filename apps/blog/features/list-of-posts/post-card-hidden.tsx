import { User } from '@smart-signer/types/common';
import { Badge } from '@ui/components';
import { Link } from '@hive/ui';
import { useEffect, useState } from 'react';

interface PostCardHiddenProps {
  user: User;
  revealPost: () => void;
}

const PostCardHidden = ({ user, revealPost }: PostCardHiddenProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const accountLink = (
    <a
      href="https://signup.hive.io/"
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-pointer text-destructive"
    >
      create an account
    </a>
  );

  if (!mounted) {
    return (
      <div>
        <Badge
          variant="outline"
          className="mx-1 border-destructive text-destructive"
          aria-label="Content marked as NSFW"
        >
          NSFW
        </Badge>
        <button
          type="button"
          onClick={revealPost}
          className="cursor-pointer text-destructive underline-offset-2 hover:underline"
          aria-label="Reveal this NSFW post"
        >
          Reveal this post
        </button>{' '}
        or {accountLink} to save your preferences.
      </div>
    );
  }

  const username = user?.username?.trim() || '';
  const isLoggedIn = Boolean(username);

  return (
    <div>
      <Badge
        variant="outline"
        className="mx-1 border-destructive text-destructive"
        aria-label="Content marked as NSFW"
      >
        NSFW
      </Badge>
      <button
        type="button"
        onClick={revealPost}
        className="cursor-pointer text-destructive underline-offset-2 hover:underline"
        aria-label="Reveal this NSFW post"
      >
        Reveal this post
      </button>{' '}
      or{' '}
      {isLoggedIn ? (
        <>
          <span>adjust your </span>
          <Link
            href={`/@${username}/settings`}
            className="cursor-pointer text-destructive underline-offset-2 hover:underline"
          >
            display preferences
          </Link>
          .
        </>
      ) : (
        <>{accountLink} to save your preferences.</>
      )}
    </div>
  );
};

export default PostCardHidden;
