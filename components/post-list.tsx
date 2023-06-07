import PostListItem from '@/components/post-list-item';
import { getFeedHistory } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';
import Loading from './loading';

const PostList = ({ data, sort }: { data: any; sort?: string | null }) => {
  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());

  if (historyFeedLoading) {
    return <Loading loading={historyFeedLoading} />;
  }
  if (!historyFeedData) {
    return <p className="my-32 text-center text-3xl">Something went wrong</p>;
  }

  return (
    <ul>
      {data?.map((post: any) => (
        <PostListItem post={post} sort={sort} key={post.post_id} historyFeedData={historyFeedData} />
      ))}
    </ul>
  );
};

export default PostList;
