import PostListItem from '@/components/post-list-item';

const PostList = ({ data, sort}: { data: any, sort?: string | null }) => {
  return (
    <ul>
      {data?.map((post: any) => (
        <PostListItem post={post} sort={sort} key={post.post_id} />
      ))}
    </ul>
  );
};

export default PostList;
