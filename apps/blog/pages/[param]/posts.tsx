import { useInfiniteQuery } from '@tanstack/react-query';
import { getAccountPosts, DATA_LIMIT as PER_PAGE } from '@ui/lib/bridge';
import ProfileLayout from '@/blog/components/common/profile-layout';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import PostList from '@/blog/components/post-list';
import { useRouter } from 'next/router';
import RepliesList from '@/blog/components/replies-list';
import { PostSkeleton } from '@/blog/pages/[...param]';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';
import { useTranslation } from 'next-i18next';

const UserPosts = () => {
  const { t } = useTranslation('common_blog');
  const router = useRouter();
  const { username } = useSiteParams();
  const { ref, inView } = useInView();
  const sort = router.pathname.split('/')[router.pathname.split('/').length - 1];

  const {
    data,
    isLoading,
    isFetching,
    error,
    isError,
    status,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage
  } = useInfiniteQuery(
    ['accountRepliesInfinite', username, sort],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getAccountPosts(
        sort || 'trending',
        username,
        'hive.blog',
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

      enabled: Boolean(sort) && !!username
    }
  );

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  return (
    <ProfileLayout>
      <div className="flex flex-col">
        <Tabs defaultValue={sort} className="w-full" onValueChange={(s) => router.push(`/@${username}/${s}`)}>
          <TabsList className="flex justify-start" data-testid="user-post-menu">
            <TabsTrigger value="posts">{t('navigation.profil_posts_tab_navbar.posts')}</TabsTrigger>
            <TabsTrigger value="comments">{t('navigation.profil_posts_tab_navbar.comments')}</TabsTrigger>
            <TabsTrigger value="payout">{t('navigation.profil_posts_tab_navbar.payouts')}</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
            {!isLoading && data ? (
              <>
                {data.pages.map((page, index) => {
                  return page && page.length > 0 ? (
                    <PostList data={page} key={`posts-${index}`} />
                  ) : (
                    <div
                      key="empty"
                      className="mt-12 bg-green-100 px-4 py-6 text-sm dark:bg-slate-700"
                      data-testid="user-has-not-made-any-post-yet"
                    >
                      {t('user_profil.no_posts_yet', { username: username })}
                    </div>
                  );
                })}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <PostSkeleton />
                    ) : hasNextPage ? (
                      'Load Newer'
                    ) : data.pages[0] && data.pages[0].length > 0 ? (
                      'Nothing more to load'
                    ) : null}
                  </button>
                </div>
                <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            ) : null}
          </TabsContent>
          <TabsContent value="comments">
            {!isLoading && data ? (
              <>
                {data.pages.map((page, index) => {
                  return page && page.length > 0 ? (
                    <RepliesList data={page} key={`replies-${index}`} />
                  ) : (
                    <div
                      key="empty"
                      className="mt-12 bg-green-100 px-4 py-6 text-sm dark:bg-slate-700"
                      data-testid="user-has-not-made-any-post-yet"
                    >
                      {t('user_profil.no_posts_yet', { username: username })}
                    </div>
                  );
                })}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <PostSkeleton />
                    ) : hasNextPage ? (
                      'Load Newer'
                    ) : data.pages[0] && data.pages[0].length > 0 ? (
                      'Nothing more to load'
                    ) : null}
                  </button>
                </div>
                <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            ) : null}
          </TabsContent>
          <TabsContent value="payout">
            {!isLoading && data ? (
              <>
                {data.pages.map((page, index) => {
                  return page && page.length > 0 ? (
                    <PostList data={page} key={`payout-${index}`} />
                  ) : (
                    <div
                      key="empty"
                      className="mt-12 bg-green-100 px-4 py-6 text-sm dark:bg-slate-700"
                      data-testid="user-no-pending-payouts"
                    >
                      {t('user_profil.no_pending_payouts')}
                    </div>
                  );
                })}
                <div>
                  <button
                    ref={ref}
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <PostSkeleton />
                    ) : hasNextPage ? (
                      t('user_profil.load_newer')
                    ) : data.pages[0] && data.pages[0].length > 0 ? (
                      t('user_profil.nothing_more_to_load')
                    ) : null}
                  </button>
                </div>
                <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </ProfileLayout>
  );
};

export default UserPosts;

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, [
        'common_blog',
        'smart-signer'
      ]))
    }
  };
};
