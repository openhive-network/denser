import PostListItem from '@/components/post-list-item';
import { getFeedHistory } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';
import Loading from './loading';

const PostList = ({
  data,
  sort,
  historyFeedData,
  isCommunityPage
}: {
  data: any;
  sort?: string | null;
  historyFeedData: any;
  isCommunityPage?: boolean;
}) => {
  return (
    <ul>
      {data?.map((post: any) => (
        <PostListItem
          post={post}
          sort={sort}
          key={post.post_id}
          historyFeedData={historyFeedData}
          isCommunityPage={isCommunityPage}
        />
      ))}
    </ul>
  );
};

export default PostList;
