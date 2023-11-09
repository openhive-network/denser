import PostListItem from '@/blog/components/post-list-item';
import { Entry } from '@/blog/lib/bridge';

const PostList = ({
  data,
  isCommunityPage
}: {
  data: Entry[];
  isCommunityPage?: boolean;
}) => {
  return (
    <ul className='w-full md:grid-cols-2 grid-cols-1 grid gap-2 pb-2'>
      {data?.map((post: Entry) => (
        <PostListItem
          post={post}
          key={post.post_id}
          isCommunityPage={isCommunityPage}
        />
      ))}
    </ul>
  );
};

export default PostList;
