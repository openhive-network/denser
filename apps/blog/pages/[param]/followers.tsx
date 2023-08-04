import ProfileLayout from '@/blog/components/common/profile-layout';
import { useFollowersInfiniteQuery } from '@/blog/components/hooks/use-followers-infinitequery';
import { useSiteParams } from '@/blog/components/hooks/use-site-params';
import PrevNextButtons from '@/blog/components/prev-next-buttons';
import { FullAccount } from '@/blog/store/app-types';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

const LIMIT = 50;
export default function Followers() {
  const { username } = useSiteParams();
  const [page, setPage] = useState(0);

  const profileData = useQueryClient().getQueryData<FullAccount>(['profileData', username]);
  const followersData = useFollowersInfiniteQuery(username, LIMIT);
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
    <ProfileLayout>
      <div className="flex flex-col gap-2 p-2">
        <h1 className="self-center p-2">
          Followers page {page + 1} from{' '}
          {profileData?.follow_stats?.follower_count
            ? Math.ceil(profileData?.follow_stats?.follower_count / LIMIT)
            : '?'}
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
              className="flex h-8 items-center p-2 font-semibold text-red-600 odd:bg-slate-200 even:bg-slate-100 dark:odd:bg-slate-800 dark:even:bg-slate-900"
            >
              <Link href={`/@${e.follower}`}>{e.follower}</Link>
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
          Followers page {page + 1} from{' '}
          {profileData?.follow_stats?.follower_count
            ? Math.ceil(profileData?.follow_stats?.follower_count / LIMIT)
            : '?'}
        </h1>
      </div>
    </ProfileLayout>
  );
}
