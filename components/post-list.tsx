import PostListItem from "@/components/post-list-item"

export default function PostList({ data }) {
  return (
    <ul className="p-2">
      {data.map((post) => (
        <PostListItem post={post} key={post.post_id} />
      ))}
    </ul>
  )
}
