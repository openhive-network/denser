import PostListItem from '@/blog/components/post-list-item';
import type { Entry } from '@transaction/lib/bridge';

const PostList = ({ data, isCommunityPage }: { data: Entry[]; isCommunityPage?: boolean }) => {
  return (
    <ul>
      {data?.map((post: Entry) => (
        <PostListItem post={post} key={post.post_id} isCommunityPage={isCommunityPage} />
      ))}
    </ul>
  );
};

export default PostList;
