import CommentListItem from '@/components/comment-list-item';

const CommentList = ({ data }: { data: any }) => {
  return (
    <ul className="p-2">
      {data?.map((comment: any) => (
        <CommentListItem comment={comment} key={comment.post_id} />
      ))}
    </ul>
  );
};
export default CommentList;
