import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { DATA_LIMIT as PER_PAGE, getAccountPosts, getSubscriptions } from '@transaction/lib/bridge';
import { Entry } from '@transaction/lib/extended-hive.chain';
import Loading from '@hive/ui/components/loading';
import { FC, useEffect } from 'react';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@ui/components/skeleton';
import { useInView } from 'react-intersection-observer';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { CommunitiesSelect } from '@/blog/components/communities-select';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getDefaultProps } from '../../lib/get-translations';
import Head from 'next/head';
import CommunityLayout from '@/blog/feature/community-layout/community-layout';
import NoDataError from '@/blog/components/no-data-error';
import { DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';

import { useLocalStorage } from 'usehooks-ts';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

export const PostSkeleton = () => {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
};

const TAB_TITLE = 'My Friends - Hive';
const FeedPage: FC = () => {
  const { t } = useTranslation('common_blog');
  const { username, tag } = useSiteParams();
  const { ref: refAcc, inView: inViewAcc } = useInView();
  const { user } = useUser();
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  // Only enable community query if tag is a valid community name (not a username)
  const isValidCommunityTag = tag && !tag.startsWith('@');

  const {
    data: accountEntriesData,
    isLoading: accountEntriesIsLoading,
    isFetching: accountEntriesIsFetching,
    isError: accountEntriesIsError,
    isFetchingNextPage: accountIsFetchingNextPage,
    fetchNextPage: accountFetchNextPage,
    hasNextPage: accountHasNextPage
  } = useInfiniteQuery(
    ['accountEntriesInfinite', username],
    async ({ pageParam }: { pageParam?: Entry }) => {
      return await getAccountPosts(
        'feed',
        username,
        user.username === '' ? 'hive.blog' : user.username,
        pageParam?.author,
        pageParam?.permlink
      );
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
  const { data: mySubsData, isError: mySubsIsError } = useQuery(
    ['subscriptions', user?.username],
    () => getSubscriptions(user?.username || ''),
    {
      enabled: Boolean(user?.username)
    }
  );
  useEffect(() => {
    if (inViewAcc && accountHasNextPage) {
      accountFetchNextPage();
    }
  }, [accountFetchNextPage, accountHasNextPage, inViewAcc]);

  if (accountEntriesIsError || mySubsIsError) return <NoDataError />;

  if (accountEntriesIsLoading && accountEntriesIsFetching) {
    return <Loading loading={accountEntriesIsLoading || accountEntriesIsFetching} />;
  }

  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>

      <CommunityLayout community={''}>
        <div className="col-span-12 pt-4 md:col-span-9 xl:col-span-8 xl:pt-0">
          <span className="text-md mt-4 hidden text-xl font-medium xl:block">
            {t('navigation.communities_nav.my_friends')}
          </span>
          <span className="xl:hidden" translate="no">
            <CommunitiesSelect
              username={user?.username}
              mySubsData={mySubsData}
              title={t('navigation.communities_nav.my_friends')}
            />
          </span>

          <div className="col-span-12 mb-5 flex flex-col py-4 md:col-span-10 lg:col-span-8">
            {!accountEntriesIsLoading && accountEntriesData ? (
              <>
                {accountEntriesData.pages[0]?.length !== 0 ? (
                  accountEntriesData.pages.map((page, index) => {
                    return page ? (
                      <PostList data={page} key={`x-${index}`} nsfwPreferences={preferences.nsfw} />
                    ) : null;
                  })
                ) : (
                  <div
                    className="border-card-empty-border flex flex-col gap-6 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
                    data-testid="user-has-not-started-blogging-yet"
                  >
                    <span>You haven&apos;t followed anyone yet!</span>
                    <span style={{ fontSize: '1.1rem' }}>
                      <Link href="/" className="w-fit text-destructive">
                        Explore Trending
                      </Link>
                    </span>
                    <Link href="/welcome" className="w-fit text-destructive">
                      New users guide
                    </Link>
                  </div>
                )}
                <div>
                  {user?.username ? (
                    <button
                      ref={refAcc}
                      onClick={() => accountFetchNextPage()}
                      disabled={!accountHasNextPage || accountIsFetchingNextPage}
                    >
                      {accountIsFetchingNextPage ? (
                        <PostSkeleton />
                      ) : accountHasNextPage ? (
                        t('user_profile.load_newer')
                      ) : accountEntriesData.pages[0] && accountEntriesData.pages[0].length > 0 ? (
                        t('user_profile.nothing_more_to_load')
                      ) : null}
                    </button>
                  ) : null}
                </div>
                <div>
                  {accountEntriesIsFetching && !accountIsFetchingNextPage ? 'Background Updating...' : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </CommunityLayout>
    </>
  );
};

export default FeedPage;
