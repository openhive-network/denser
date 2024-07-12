import ProfileLayout from '@/blog/components/common/profile-layout';
import { useFollowersInfiniteQuery } from '@/blog/components/hooks/use-followers-infinitequery';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import PrevNextButtons from '@/blog/components/prev-next-buttons';
import { FullAccount } from '@ui/store/app-types';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { useFollowingInfiniteQuery } from '@/blog/components/hooks/use-following-infinitequery';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getServerSidePropsDefault } from '../../lib/get-translations';
import ButtonsContainer from '@/blog/components/buttons-container';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

const LIMIT = 50;
export default function Followers() {
  const { username } = useSiteParams();
  const { t } = useTranslation('common_blog');
  const [page, setPage] = useState(0);
  const { user } = useUser();
  const profileData = useQueryClient().getQueryData<FullAccount>(['profileData', username]);
  const followersData = useFollowersInfiniteQuery(username, LIMIT);
  const following = useFollowingInfiniteQuery(user.username, 50, 'blog', ['blog']);
  const mute = useFollowingInfiniteQuery(user.username, 50, 'ignore', ['ignore']);

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
              className="odd:bg-background-tertiary flex items-center justify-between px-3 font-semibold text-destructive even:bg-slate-100 dark:even:bg-slate-900"
            >
              <Link href={`/@${e.follower}`}>{e.follower}</Link>
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
    </ProfileLayout>
  );
}
