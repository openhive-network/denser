import { useSiteParams } from '@/components/hooks/use-site-params';
import { useQuery } from '@tanstack/react-query';
import { getAccountPosts, getCommunity, getPostsRanked } from '@/lib/bridge';
import Loading from '@/components/loading';
import { FC, useCallback } from 'react';
import PostList from '@/components/post-list';
import { Skeleton } from '@/components/ui/skeleton';
import CommunitiesSidebar from '@/components/communities-sidebar';
import PostSelectFilter from '@/components/post-select-filter';
import { useRouter } from 'next/router';
import ExploreHive from '@/components/explore-hive';
import UserShortcutsCard from '@/components/user-shortcuts-card';
import ProfileLayout from '@/components/common/profile-layout';
import CommunityDescription from '@/components/community-description';

const PostSkeleton = () => {
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

const ParamPage: FC = () => {
  const router = useRouter();
  const { sort, username, tag } = useSiteParams();

  const {
    data: entriesData,
    isLoading: entriesDataIsLoading,
    isFetching: entriesDataIsFetching,
    error: entriesDataError
  } = useQuery(
    ['entries', sort, tag],
    async () => {
      return await getPostsRanked(sort || 'trending', tag).then((res) => {
        return res;
      });
    },
    { enabled: Boolean(sort) }
  );

  const {
    data: communityData,
    isLoading: communityDataIsLoading,
    isFetching: communityDataIsFetching,
    error: communityDataError
  } = useQuery(['community', tag, ''], () => getCommunity(tag || '', ''), { enabled: !!tag });

  const {
    data: accountEntriesData,
    isLoading: accountEntriesIsLoading,
    isFetching: accountEntriesIsFetching,
    error: accountEntriesError
  } = useQuery(
    ['accountEntries', username],
    async () => {
      return await getAccountPosts('blog', username, '').then((res) => {
        return res;
      });
    },
    { enabled: Boolean(username) }
  );

  const handleChangeFilter = useCallback(
    (e: any) => {
      if (tag) {
        router.push(`/${e}/${tag}`, undefined, { shallow: true });
      } else {
        router.push(`/${e}`, undefined, { shallow: true });
      }
    },
    [router, tag]
  );

  if (
    (entriesDataIsLoading && entriesDataIsFetching) ||
    (accountEntriesIsLoading && accountEntriesIsFetching)
  ) {
    return <Loading />;
  }

  if (!entriesDataIsLoading && entriesData) {
    return (
      <div className="container mx-auto max-w-screen-xl flex-grow px-4 pb-2 pt-8">
        <div className="grid grid-cols-12 lg:gap-8 ">
          <div className="col-span-12 mb-5 space-y-5 md:col-span-12 lg:col-span-8">
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{tag ? 'Community' : 'All posts'}</span>
                {tag && communityData ? (
                  <span className="text-xs font-light">{communityData?.title}</span>
                ) : null}
              </div>
              <PostSelectFilter filter={sort} handleChangeFilter={handleChangeFilter} />
            </div>
            <PostList data={entriesData} sort={sort} />
          </div>
          <div className="col-span-12 md:col-span-12 lg:col-span-4">
            {communityData ? <CommunityDescription data={communityData} /> : <ExploreHive />}
            <CommunitiesSidebar />
            <UserShortcutsCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout>
      <PostList data={accountEntriesData} />
    </ProfileLayout>
  );
};

export default ParamPage;
