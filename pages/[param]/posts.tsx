import { useQuery } from '@tanstack/react-query';
import { getAccountPosts } from '@/lib/bridge';
import ProfileLayout from '@/components/common/profile-layout';
import Loading from '@/components/loading';
import { useSiteParams } from '@/components/hooks/use-site-params';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PostList from '@/components/post-list';
import { useRouter } from 'next/router';
import RepliesList from '@/components/replies-list';
import { getFeedHistory } from '@/lib/hive';

const UserPosts = () => {
  const router = useRouter();
  const { username } = useSiteParams();
  const sort = router.pathname.split('/')[router.pathname.split('/').length - 1];
  const { isLoading, error, data } = useQuery(
    ['accountReplies', username, sort],
    () => getAccountPosts(sort, username, 'hive.blog'),
    { enabled: !!username }
  );

  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isFetching: historyFeedIsFetching,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());

  if (isLoading || historyFeedLoading) return <Loading loading={isLoading} />;

  return (
    <ProfileLayout>
      <div className="flex flex-col">
        <Tabs defaultValue={sort} className="w-full" onValueChange={(s) => router.push(`/@${username}/${s}`)}>
          <TabsList className="flex" data-testid="user-post-menu">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="payout">Payouts</TabsTrigger>
          </TabsList>
          <TabsContent value="posts">
            <PostList data={data} historyFeedData={historyFeedData} />
            {/*<Button*/}
            {/*  variant="outline"*/}
            {/*  className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"*/}
            {/*  onClick={handleLoadMore}*/}
            {/*>*/}
            {/*  Load more*/}
            {/*</Button>*/}
          </TabsContent>
          <TabsContent value="comments">
            <RepliesList data={data} />
            {/*<Button*/}
            {/*  variant="outline"*/}
            {/*  className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"*/}
            {/*  onClick={handleLoadMore}*/}
            {/*>*/}
            {/*  Load more*/}
            {/*</Button>*/}
          </TabsContent>
          <TabsContent value="payout">
            <PostList data={data} historyFeedData={historyFeedData} />
            {/*<Button*/}
            {/*  variant="outline"*/}
            {/*  className="mt-4 mb-8 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"*/}
            {/*  onClick={handleLoadMore}*/}
            {/*>*/}
            {/*  Load more*/}
            {/*</Button>*/}
          </TabsContent>
        </Tabs>
      </div>
    </ProfileLayout>
  );
};

export default UserPosts;
