import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getDefaultProps } from '../lib/get-translations';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Loading from '@ui/components/loading';
import { PostSkeleton } from './[...param]';
import { useInView } from 'react-intersection-observer';
import Head from 'next/head';
import PostList from '../components/post-list';
import { getSearch } from '@transaction/lib/bridge';
import { ModeSwitchInput } from '@ui/components/mode-switch-input';
import { useLocalStorage } from 'usehooks-ts';
import { useEffect } from 'react';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Preferences } from '@transaction/lib/app-types';
import { DEFAULT_PREFERENCES } from './[param]/settings';
import { useFollowListQuery } from '../components/hooks/use-follow-list';
import { useTranslation } from 'next-i18next';
import SearchCard from '../components/search-card';
import { toast } from '@ui/components/hooks/use-toast';
import { getHiveSenseStatus, getSimilarPosts } from '../lib/get-data';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

const TAB_TITLE = 'Search - Hive';
export default function SearchPage() {
  const router = useRouter();
  const { ref, inView } = useInView();
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const query = router.query.q as string;
  const sort = router.query.s as string;
  const aiSearch = !!query && !sort;
  const { data: hiveSense, isLoading: hiveSenseLoading } = useQuery(
    ['hivesense-api'],
    () => getHiveSenseStatus(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false
    }
  );
  const { data, isLoading } = useQuery(
    ['posts', query],
    () =>
      getSimilarPosts({
        pattern: query,
        observer: user.username !== '' ? user.username : 'hive.blog'
      }),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      enabled: aiSearch
    }
  );
  const {
    data: entriesData,
    isLoading: entriesDataIsLoading,
    isFetching: entriesDataIsFetching,
    isError: entriesDataIsError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteQuery(
    ['infiniteSearch', query, sort],
    (lastPage) => getSearch(query, lastPage.pageParam, sort),
    {
      getNextPageParam: (lastPage) => lastPage.scroll_id,
      enabled: Boolean(sort) && Boolean(query)
    }
  );
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);

  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');
  useEffect(() => {
    if (entriesDataIsError) {
      toast({
        title: 'Error',
        description: 'There was an error fetching the data.',
        variant: 'destructive'
      });
    }
  }, [entriesDataIsError]);
  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="m-auto flex max-w-4xl flex-col gap-12 px-4 py-8">
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <ModeSwitchInput aiAvailable={!!hiveSense} isLoading={hiveSenseLoading} searchPage />
          </div>
        </div>
        {!aiSearch || !query ? null : isLoading ? (
          <Loading loading={isLoading} />
        ) : data ? (
          <PostList data={data} />
        ) : null}
        {!!sort ? (
          <>
            {entriesDataIsError ? null : entriesDataIsLoading ? (
              <Loading loading={entriesDataIsLoading && entriesDataIsFetching} />
            ) : !entriesData ? (
              'Nothing was found.'
            ) : (
              entriesData.pages.map((data, i) => (
                <ul key={i}>
                  {data.results.map((post) => (
                    <SearchCard post={post} key={post.id} nsfw={preferences.nsfw} blacklist={blacklist} />
                  ))}
                </ul>
              ))
            )}
            <div>
              <button ref={ref} onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
                {isFetchingNextPage ? (
                  <PostSkeleton />
                ) : hasNextPage ? (
                  t('user_profile.load_newer')
                ) : (
                  t('user_profile.nothing_more_to_load')
                )}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
