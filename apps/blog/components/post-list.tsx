import PostListItem from '@/blog/components/post-list-item';
import Big from 'big.js';
import { Entry } from '@/blog/lib/bridge';

const PostList = ({
  data,
  sort,
  price_per_hive,
  isCommunityPage
}: {
  data: Entry[];
  sort?: string | null;
  price_per_hive: Big;
  isCommunityPage?: boolean;
}) => {
  return (
    <ul>
      {data?.map((post: Entry) => (
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
