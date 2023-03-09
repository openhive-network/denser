import CommentListItem from '@/components/comment-list-item';

export default function CommentList({ data }) {
  return (
    <ul className="p-2">
      {data.map((comment) => (
        <CommentListItem comment={comment} key={comment.id} />
      ))}
    </ul>
  )
}
