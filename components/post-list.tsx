import PostListItem from '@/components/post-list-item';
import { getFeedHistory } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';
import Loading from './loading';

const PostList = ({
  data,
  sort,
  historyFeedData
}: {
  data: any;
  sort?: string | null;
  historyFeedData: any;
}) => {
  return (
    <ul>
      {data?.map((post: any) => (
        <PostListItem post={post} sort={sort} key={post.post_id} historyFeedData={historyFeedData} />
      ))}
    </ul>
  );
};

export default PostList;
