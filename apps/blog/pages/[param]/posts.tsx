import { useInfiniteQuery } from '@tanstack/react-query';
import { getAccountPosts, DATA_LIMIT as PER_PAGE } from '@transaction/lib/bridge';
import ProfileLayout from '@/blog/components/common/profile-layout';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import PostList from '@/blog/components/post-list';
import { useRouter } from 'next/router';
import RepliesList from '@/blog/components/replies-list';
import { PostSkeleton } from '@/blog/pages/[...param]';
import { useInView } from 'react-intersection-observer';
import { FC, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import { getTranslations } from '../../lib/get-translations';
import { getAccountFull } from '@transaction/lib/hive';
import Head from 'next/head';

const UserPosts: FC<{ tabTitle: string }> = ({ tabTitle }) => {
  const { t } = useTranslation('common_blog');
  const router = useRouter();
  const { username } = useSiteParams();
  const { ref, inView } = useInView();
  const sort = router.pathname.split('/')[router.pathname.split('/').length - 1];
  const { user } = useUser();
  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery(
    ['accountRepliesInfinite', username, sort],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getAccountPosts(
        sort || 'trending',
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

      enabled: Boolean(sort) && !!username
    }
  );
  const legalBlockedUser = userIllegalContent.includes(username);

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  return (
    <>
      <Head>
        <title>{tabTitle}</title>
      </Head>
      <ProfileLayout>
        <div className="flex flex-col">
          <Tabs
            defaultValue={sort}
            className="w-full"
            onValueChange={(s) => router.push(`/@${username}/${s}`)}
          >
            <TabsList className="flex justify-start bg-background-tertiary" data-testid="user-post-menu">
              <TabsTrigger value="posts">{t('navigation.profile_posts_tab_navbar.posts')}</TabsTrigger>
              <TabsTrigger value="comments">{t('navigation.profile_posts_tab_navbar.comments')}</TabsTrigger>
              <TabsTrigger value="payout">{t('navigation.profile_posts_tab_navbar.payouts')}</TabsTrigger>
            </TabsList>
            <TabsContent value="posts">
              {!legalBlockedUser ? (
                <>
                  {!isLoading && data ? (
                    <>
                      {data.pages.map((page, index) => {
                        return page && page.length > 0 ? (
                          <PostList data={page} key={`posts-${index}`} />
                        ) : (
                          <div
                            key="empty"
                            className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
                            data-testid="user-has-not-made-any-post-yet"
                          >
                            {t('user_profile.no_posts_yet', { username: username })}
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
                </>
              ) : (
                <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
              )}
            </TabsContent>
            <TabsContent value="comments">
              {!legalBlockedUser ? (
                <>
                  {!isLoading && data ? (
                    <>
                      {data.pages.map((page, index) => {
                        return page && page.length > 0 ? (
                          <RepliesList data={page} key={`replies-${index}`} />
                        ) : (
                          <div
                            key="empty"
                            className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
                            data-testid="user-has-not-made-any-post-yet"
                          >
                            {t('user_profile.no_posts_yet', { username: username })}
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
                </>
              ) : (
                <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
              )}
            </TabsContent>
            <TabsContent value="payout">
              {!legalBlockedUser ? (
                <>
                  {!isLoading && data ? (
                    <>
                      {data.pages.map((page, index) => {
                        return page && page.length > 0 ? (
                          <PostList data={page} key={`payout-${index}`} />
                        ) : (
                          <div
                            key="empty"
                            className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
                            data-testid="user-no-pending-payouts"
                          >
                            {t('user_profile.no_pending_payouts')}
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
                            t('user_profile.load_newer')
                          ) : data.pages[0] && data.pages[0].length > 0 ? (
                            t('user_profile.nothing_more_to_load')
                          ) : null}
                        </button>
                      </div>
                      <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
                    </>
                  ) : null}{' '}
                </>
              ) : (
                <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ProfileLayout>
    </>
  );
};

export default UserPosts;

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
            ? `Posts by ${username} - Hive`
            : `Posts by ${username}(${firstParam}) - Hive`;
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
