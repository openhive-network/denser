import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DATA_LIMIT as PER_PAGE } from '@transaction/lib/bridge';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { useEffect } from 'react';
import ProfileLayout from '@/blog/features/layouts/user-profile/profile-layout';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import Head from 'next/head';
import { MetadataProps } from '@/blog/lib/get-translations';
import NoDataError from '@/blog/components/no-data-error';
import { Preferences } from '@/blog/lib/utils';
import PostCardSkeleton from '@hive/ui/components/card-skeleton';
import { getAccountPosts } from '@transaction/lib/bridge-api';
import PostList from '../list-of-posts/posts-loader';

const AccountProfileMainPage = ({
  metadata,
  nsfwPreferences
}: {
  metadata: MetadataProps;
  nsfwPreferences: Preferences['nsfw'];
}) => {
  const { username } = useSiteParams();
  const legalBlockedUser = userIllegalContent.includes(username);
  const { ref, inView } = useInView();
  const { t } = useTranslation('common_blog');
  const { user } = useUser();

  const { data, isFetching, isError, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery(
    ['accountEntriesInfinite', username],
    async ({ pageParam }: { pageParam?: Entry }) => {
      return await getAccountPosts('blog', username, user.username, pageParam?.author, pageParam?.permlink);
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.length === PER_PAGE) {
          return {
            author: lastPage[lastPage.length - 1].author,
            permlink: lastPage[lastPage.length - 1].permlink
          };
        }
      },
      enabled: Boolean(username)
    }
  );

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);

  if (isError) return <NoDataError />;

  return (
    <>
      <Head>
        <title>{metadata.tabTitle}</title>
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:image" content={metadata.image} />
      </Head>
      {!legalBlockedUser ? (
        <ProfileLayout>
          <>
            {data && data.pages ? (
              <>
                {data.pages[0]?.length !== 0 ? (
                  data.pages.map((page, index) => {
                    return page ? (
                      <PostList
                        data={page}
                        key={`x-${index}`}
                        nsfwPreferences={nsfwPreferences}
                        testFilter="profile-blog-list"
                      />
                    ) : null;
                  })
                ) : (
                  <div
                    className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
                    data-testid="user-has-not-started-blogging-yet"
                  >
                    {t('user_profile.no_blogging_yet', { username: username })}
                  </div>
                )}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage && data.pages.length > 0 ? (
                      <PostCardSkeleton />
                    ) : hasNextPage ? (
                      t('user_profile.load_newer')
                    ) : data.pages[0] && data.pages[0].length > 0 ? (
                      t('user_profile.nothing_more_to_load')
                    ) : null}
                  </button>
                </div>
                <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            ) : null}
          </>
        </ProfileLayout>
      ) : (
        <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
      )}
    </>
  );
};

export default AccountProfileMainPage;
