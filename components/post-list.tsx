import PostListItem from '@/components/post-list-item';
import { getFeedHistory } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';
import Loading from './loading';
import Big from 'big.js';

const PostList = ({
  data,
  sort,
  price_per_hive,
  isCommunityPage
}: {
  data: any;
  sort?: string | null;
  price_per_hive: Big;
  isCommunityPage?: boolean;
}) => {
  return (
    <ul>
      {data?.map((post: any) => (
        <PostListItem
          post={post}
          sort={sort}
          key={post.post_id}
          price_per_hive={price_per_hive}
          isCommunityPage={isCommunityPage}
        />
      ))}
    </ul>
  );
};

export default PostList;
