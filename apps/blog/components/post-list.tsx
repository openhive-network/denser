import PostListItem from '@/blog/components/post-list-item';
import Big from 'big.js';
import { Entry } from '@/blog/lib/bridge';

const PostList = ({
  data,
  sort,
  isCommunityPage
}: {
  data: Entry[];
  sort?: string | null;
  isCommunityPage?: boolean;
}) => {
  return (
    <ul>
      {data?.map((post: Entry) => (
        <PostListItem
          post={post}
          sort={sort}
          key={post.post_id}
          isCommunityPage={isCommunityPage}
        />
      ))}
    </ul>
  );
};

export default PostList;
