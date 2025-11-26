'use client';

import BasePathLink from '@/blog/components/base-path-link';
import PrevNextButtons from '@/blog/features/account-lists/prev-next-buttons';
import { useFollowingInfiniteQuery } from '@/blog/features/account-lists/hooks/use-following-infinitequery';
import { useTranslation } from '@/blog/i18n/client';
import { useQuery } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
import { useState } from 'react';
import ButtonsContainer from '@/blog/features/mute-follow/buttons-container';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const LIMIT = 50;

const FollowedContent = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');

  const { data: profileData } = useQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });
  const [page, setPage] = useState(0);

  const { user } = useUserClient();
  const followingData = useFollowingInfiniteQuery(username, LIMIT);
  const following = useFollowingInfiniteQuery(user?.username || '', 1000, 'blog', ['blog']);
  const mute = useFollowingInfiniteQuery(user.username, 1000, 'ignore', ['ignore']);

  const handleNextPage = () => {
    if (!followingData.data) return;

    if (page + 1 < followingData.data.pages.length) {
      return setPage((prev) => prev + 1);
    }
    followingData.fetchNextPage().then(() => setPage((prev) => prev + 1));
  };
  const handlePrevPage = () => {
    if (page <= 0) return;
    setPage((prev) => prev - 1);
  };

  return (
    <div className="flex flex-col gap-2 p-2">
      <h1 className="self-center p-2">
        {t('user_profile.lists.followed_pages', {
          current: page + 1,
          total: profileData?.follow_stats?.following_count
            ? Math.ceil(profileData?.follow_stats?.following_count / LIMIT)
            : '?'
        })}
      </h1>
      <PrevNextButtons
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        hasNextPage={!!followingData.hasNextPage}
        hasPrevPage={page > 0}
        isLoading={followingData.isFetchingNextPage}
      />
      <ul>
        {followingData.data?.pages[page].map((e) => (
          <li
            key={e.following}
            className="flex items-center justify-between bg-background-tertiary px-3 font-semibold text-destructive odd:bg-background"
          >
            <BasePathLink href={`/@${e.following}`}>{e.following}</BasePathLink>
            {!user.isLoggedIn || user.username === e.following ? null : (
              <div className="flex gap-2">
                <ButtonsContainer
                  username={e.following}
                  user={user}
                  variant="basic"
                  follow={following}
                  mute={mute}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <PrevNextButtons
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        hasNextPage={!!followingData.hasNextPage}
        hasPrevPage={page > 0}
        isLoading={followingData.isFetchingNextPage}
      />
      <h1 className="self-center p-2">
        {t('user_profile.lists.followed_pages', {
          current: page + 1,
          total: profileData?.follow_stats?.following_count
            ? Math.ceil(profileData?.follow_stats?.following_count / LIMIT)
            : '?'
        })}
      </h1>
    </div>
  );
};

export default FollowedContent;
