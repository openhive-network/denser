import PostListItem from "@/components/post-list-item"

export default function Feed({ data }) {
  // To check, I don't know why object structure change over fist milliseconds
  if (data.data && data.data.length > 0) {
    return null
  }


  return (
    <div>
      {data.length === 0 ? (
        <p className="p-4">No posts yet</p>
      ) : (
        <ul data-testid="posts-list">
          {data.map((post) => (
            <PostListItem post={post} key={post.post_id} />
          ))}
        </ul>
      )}
    </div>
  )
}
