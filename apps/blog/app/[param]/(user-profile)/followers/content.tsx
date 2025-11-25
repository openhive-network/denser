'use client';

import BasePathLink from '@/blog/components/base-path-link';
import { useFollowersInfiniteQuery } from '@/blog/features/account-lists/hooks/use-followers-infinitequery';
import { useFollowingInfiniteQuery } from '@/blog/features/account-lists/hooks/use-following-infinitequery';
import PrevNextButtons from '@/blog/features/account-lists/prev-next-buttons';
import ButtonsContainer from '@/blog/features/mute-follow/buttons-container';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useQuery } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
import { useState } from 'react';

const LIMIT = 50;

const FollowersContent = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');
  const [page, setPage] = useState(0);
  const { user } = useUserClient();

  const { data: profileData } = useQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username)
  });

  const followersData = useFollowersInfiniteQuery(username, LIMIT);
  const following = useFollowingInfiniteQuery(user.username, 1000, 'blog', ['blog']);
  const mute = useFollowingInfiniteQuery(user.username, 1000, 'ignore', ['ignore']);

  const handleNextPage = () => {
    if (!followersData.data) return;

    if (page + 1 < followersData.data.pages.length) {
      return setPage((prev) => prev + 1);
    }
    followersData.fetchNextPage().then(() => setPage((prev) => prev + 1));
  };
  const handlePrevPage = () => {
    if (page <= 0) return;
    setPage((prev) => prev - 1);
  };
  return (
    <div className="flex flex-col gap-2 p-2">
      <h1 className="self-center p-2">
        {t('user_profile.lists.followers_pages', {
          current: page + 1,
          total: profileData?.follow_stats?.follower_count
            ? Math.ceil(profileData?.follow_stats?.follower_count / LIMIT)
            : 1
        })}
      </h1>
      <PrevNextButtons
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        hasNextPage={!!followersData.hasNextPage}
        hasPrevPage={page > 0}
        isLoading={followersData.isFetchingNextPage}
      />
      <ul>
        {followersData.data?.pages[page].map((e) => (
          <li
            key={e.follower}
            className="flex items-center justify-between bg-background-tertiary px-3 font-semibold text-destructive odd:bg-background"
          >
            <BasePathLink href={`/@${e.follower}`}>{e.follower}</BasePathLink>
            {!user.isLoggedIn || user.username === e.follower ? null : (
              <div>
                <ButtonsContainer
                  username={e.follower}
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
        hasNextPage={!!followersData.hasNextPage}
        hasPrevPage={page > 0}
        isLoading={followersData.isFetchingNextPage}
      />
      <h1 className="self-center p-2">
        {t('user_profile.lists.followers_pages', {
          current: page + 1,
          total: profileData?.follow_stats?.follower_count
            ? Math.ceil(profileData?.follow_stats?.follower_count / LIMIT)
            : 1
        })}
      </h1>
    </div>
  );
};

export default FollowersContent;
