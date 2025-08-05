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
import { getAccountMetadata, getTranslations, MetadataProps } from '@/blog/lib/get-translations';
import Head from 'next/head';

const LIMIT = 50;
export default function Followed({ metadata }: { metadata: MetadataProps }) {
  const { username } = useSiteParams();
  const { t } = useTranslation('common_blog');
  const [page, setPage] = useState(0);
  const profileData = useQueryClient().getQueryData<FullAccount>(['profileData', username]);

  const { user } = useUser();
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
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      <ProfileLayout>
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
              total: profileData?.follow_stats?.following_count
                ? Math.ceil(profileData?.follow_stats?.following_count / LIMIT)
                : '?'
            })}
          </h1>
        </div>
      </ProfileLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: {
      metadata: await getAccountMetadata((ctx.params?.param as string) ?? '', 'Followers of'),
      ...(await getTranslations(ctx))
    }
  };
};
