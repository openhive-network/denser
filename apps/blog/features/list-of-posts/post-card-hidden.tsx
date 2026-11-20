import { User } from '@smart-signer/types/common';
import { Badge } from '@ui/components';
import { Link } from '@hive/ui';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from '@/blog/i18n/client';

interface PostCardHiddenProps {
  user: User;
  revealPost: () => void;
}

const PostCardHidden = ({ user, revealPost }: PostCardHiddenProps) => {
  const { t } = useTranslation('common_blog');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const revealButton = (
    <button
      type="button"
      onClick={revealPost}
      className="cursor-pointer text-destructive underline-offset-2 hover:underline"
      aria-label={t('cards.reveal_nsfw_post')}
    />
  );
  const accountLink = (
    <a
      href="https://signup.hive.io/"
      target="_blank"
      rel="noopener noreferrer"
      className="cursor-pointer text-destructive"
    />
  );
  const badge = (
    <Badge
      variant="outline"
      className="mx-1 border-destructive text-destructive"
      aria-label={t('cards.content_marked_nsfw')}
    >
      NSFW
    </Badge>
  );

  const username = mounted ? user?.username?.trim() || '' : '';

  return (
    <div>
      {badge}
      {username ? (
        <Trans
          i18nKey="cards.nsfw_hidden_logged_in"
          components={{
            reveal: revealButton,
            settings: (
              <Link
                href={`/@${username}/settings`}
                className="cursor-pointer text-destructive underline-offset-2 hover:underline"
              />
            )
          }}
        />
      ) : (
        <Trans i18nKey="cards.nsfw_hidden_logged_out" components={{ reveal: revealButton, account: accountLink }} />
      )}
    </div>
  );
};

export default PostCardHidden;
