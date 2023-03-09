import { useQuery } from '@tanstack/react-query';
import { getAccountPosts } from '@/lib/bridge';
import CommentList from '@/components/comment-list';

export default function CommentsProvider() {
  const { isLoading, error, data } = useQuery({
    queryKey: ["postsData"],
    queryFn: () => getAccountPosts("comments", "meesterboom")
  })

  if (isLoading) return <p>Loading...</p>

  return (
    <CommentList data={data} />
  )
}
