import ProfileLayout from '@/blog/components/common/profile-layout';
import { useFollowingInfiniteQuery } from '@/blog/components/hooks/use-following-infinitequery';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import PrevNextButtons from '@/blog/components/prev-next-buttons';
import { FullAccount } from '@ui/store/app-types';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import ButtonsContainer from '@/blog/components/buttons-container';
import { getAccountFull } from '@transaction/lib/hive';
import { getTranslations } from '@/blog/lib/get-translations';
import Head from 'next/head';

const LIMIT = 50;
export default function Followed({ tabTitle }: { tabTitle: string }) {
  const { username } = useSiteParams();
  const { t } = useTranslation('common_blog');
  const [page, setPage] = useState(0);
  const profileData = useQueryClient().getQueryData<FullAccount>(['profileData', username]);
  const { user } = useUser();
  const followingData = useFollowingInfiniteQuery(username, LIMIT);
  const following = useFollowingInfiniteQuery(user?.username || '', 50, 'blog', ['blog']);
  const mute = useFollowingInfiniteQuery(user.username, 50, 'ignore', ['ignore']);

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
    <>
      <Head>
        <title>{tabTitle}</title>
      </Head>
      <ProfileLayout>
        <div className="flex flex-col gap-2 p-2">
          <h1 className="self-center p-2">
            {t('user_profile.lists.followed_pages', {
              current: page + 1,
              total: profileData?.follow_stats?.follower_count
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
                className="flex items-center justify-between bg-background-tertiary px-3 font-semibold text-destructive odd:bg-background"
              >
                <Link href={`/@${e.following}`}>{e.following}</Link>
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
              total: profileData?.follow_stats?.follower_count
                ? Math.ceil(profileData?.follow_stats?.follower_count / LIMIT)
                : '?'
            })}
          </h1>
        </div>
      </ProfileLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const firstParam = (ctx.params?.param as string) ?? '';

  let tabTitle;
  if (firstParam.startsWith('@')) {
    try {
      // Fetch account data
      const data = await getAccountFull(firstParam.split('@')[1]);
      if (data) {
        // If the account data exists, set the username to the account name
        const username = data?.profile?.name ?? data.name;
        tabTitle =
          '@' + username === firstParam
            ? `People followed ${username} - Hive`
            : `People followed ${username}(${firstParam}) - Hive`;
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  }

  return {
    props: {
      tabTitle,
      ...(await getTranslations(ctx))
    }
  };
};
