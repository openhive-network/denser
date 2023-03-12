import PostListItem from '@/components/post-list-item';

export default function Feed({ data }) {
  return (
    <div>
      {data.length === 0 ? (
        <p className="p-4">No posts yet</p>
      ) : (
        <ul>
          {data.map((post) => (
            <li key={post.author}>
              <PostListItem post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
