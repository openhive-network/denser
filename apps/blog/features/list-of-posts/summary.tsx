'use client';

import PostCardHidden from '@/blog/features/list-of-posts/post-card-hidden';
import { getPostSummary, Preferences } from '@/blog/lib/utils';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { Badge } from '@ui/components/badge';
import { CardContent, CardDescription, CardTitle } from '@ui/components/card';
import { Separator } from '@ui/components/separator';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

const PostSummary = ({
  post,
  nsfw,
  setNSFW,
  userFromDMCA,
  legalBlockedUser
}: {
  post: Entry;
  nsfw: Preferences['nsfw'];
  setNSFW: (nsfw: Preferences['nsfw']) => void;
  userFromDMCA: boolean;
  legalBlockedUser: boolean;
}) => {
  const { t } = useTranslation('common_blog');
  const revealPost = () => setNSFW(nsfw === 'warn' ? 'show' : 'warn');
  const { user } = useUser();
  return (
    <CardContent>
      {nsfw === 'show' ? (
        <>
          <CardTitle data-testid="post-title" className="text-md">
            {post.json_metadata?.tags && post.json_metadata?.tags.includes('nsfw') ? (
              <Badge variant="outline" className="mx-1 border-destructive text-destructive">
                nsfw
              </Badge>
            ) : null}
            <Link
              href={`/${post.category}/@${post.author}/${post.permlink}`}
              className="whitespace-normal break-words visited:text-gray-500 dark:visited:text-gray-400"
            >
              {post.title}
            </Link>
          </CardTitle>
          <CardDescription className="block w-auto whitespace-pre-wrap break-words md:overflow-hidden md:overflow-ellipsis md:whitespace-nowrap">
            <Link href={`/${post.category}/@${post.author}/${post.permlink}`} data-testid="post-description">
              {userFromDMCA
                ? t('cards.content_removed')
                : legalBlockedUser
                  ? t('global.unavailable_for_legal_reasons')
                  : getPostSummary(post.json_metadata, post.body)}
            </Link>
          </CardDescription>
          <Separator orientation="horizontal" className="my-1" />
        </>
      ) : (
        <PostCardHidden user={user} revealPost={revealPost} />
      )}
    </CardContent>
  );
};

export default PostSummary;
