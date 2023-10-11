import ProfileLayout from '@/blog/components/common/profile-layout';
import { useFollowingInfiniteQuery } from '@/blog/components/hooks/use-following-infinitequery';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import PrevNextButtons from '@/blog/components/prev-next-buttons';
import { FullAccount } from '@hive/ui/store/app-types';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';

const LIMIT = 50;
export default function Followed() {
  const { username } = useSiteParams();
  const { t } = useTranslation('common_blog');
  const [page, setPage] = useState(0);
  const profileData = useQueryClient().getQueryData<FullAccount>(['profileData', username]);

  const followingData = useFollowingInfiniteQuery(username, LIMIT);
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
    <ProfileLayout>
      <div className='flex flex-col gap-2 p-2'>
        <h1 className='self-center p-2'>
          {t('cards.user_profil.lists.followed_pages', {
            current: page + 1, totaol: profileData?.follow_stats?.follower_count
              ? Math.ceil(profileData?.follow_stats?.follower_count / LIMIT)
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
              className='flex h-8 items-center p-2 font-semibold text-red-600 odd:bg-slate-200 even:bg-slate-100 dark:odd:bg-slate-800 dark:even:bg-slate-900'
            >
              <Link href={`/@${e.following}`}>{e.following}</Link>
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
        <h1 className='self-center p-2'>
          {t('cards.user_profil.lists.followed_pages', {
            current: page + 1, totaol: profileData?.follow_stats?.follower_count
              ? Math.ceil(profileData?.follow_stats?.follower_count / LIMIT)
              : '?'
          })}
        </h1>
      </div>
    </ProfileLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_blog']))
    }
  };
};