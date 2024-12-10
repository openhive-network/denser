'use client';

import { CommunitiesSelect } from '@/blog/components/communities-select';
import PostSelectFilter from '@/blog/components/post-select-filter';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { Community, DATA_LIMIT as PER_PAGE, getPostsRanked } from '@transaction/lib/bridge';
import PostList from '@/blog/components/post-list';
import { Skeleton } from '@ui/components';
import { useInView } from 'react-intersection-observer';
import Loading from '@ui/components/loading';
import PostSkeleton from '@/blog/components/postSkeleton';

const Content = ({
  communityTag,
  communityData,
  sort
}: {
  communityTag: string;
  communityData: Community;
  sort: string;
}) => {
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const { ref, inView } = useInView();
  const router = useRouter();
  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery(
    ['entriesInfinite', sort, communityTag],
    async ({ pageParam }: { pageParam?: { author: string; permlink: string } }) => {
      return await getPostsRanked(
        sort || 'trending',
        communityTag,
        pageParam?.author,
        pageParam?.permlink,
        user.username
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
      enabled: Boolean(sort)
    }
  );
  const handleChangeFilter = useCallback(
    (e: string) => {
      if (communityTag) {
        router.push(`/${e}/${communityTag}`);
      } else {
        router.push(`/${e}`);
      }
    },
    [router, communityTag]
  );
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, inView]);
  if (isLoading || !data) {
    return <Loading loading={isLoading || !data} />;
  }
  return (
    <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
      <div className="my-4 flex w-full items-center justify-between" translate="no">
        <div className="mr-2 flex w-[320px] flex-col">
          <span className="text-md hidden font-medium md:block" data-testid="community-name">
            {communityTag
              ? communityData
                ? `${communityData?.title}`
                : `#${communityTag}`
              : t('navigation.communities_nav.all_posts')}
          </span>
          {communityTag ? (
            <span className="hidden text-xs font-light md:block" data-testid="community-name-unmoderated">
              {communityData ? t('communities.community') : t('communities.unmoderated_tag')}
            </span>
          ) : null}
          <span className="md:hidden">
            <CommunitiesSelect
              username={user?.username ? user.username : undefined}
              title={
                communityTag
                  ? communityData
                    ? `${communityData?.title}`
                    : `#${communityTag}`
                  : t('navigation.communities_nav.all_posts')
              }
            />
          </span>
        </div>
        <div className="w-[180px]">
          <PostSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
        </div>
      </div>
      <>
        {data.pages.map((page, index) => {
          return page ? <PostList data={page} key={`f-${index}`} isCommunityPage={!!communityData} /> : null;
        })}
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
        <div>{isFetching && !isFetchingNextPage ? 'Background Updating...' : null}</div>
      </>
    </div>
  );
};
export default Content;
