import CommentListItem from '@/components/comment-list-item';
import { Entry } from '@/lib/bridge';

const CommentList = ({ data, parent }: { data: any; parent: any }) => {
  let filtered = data.filter((x: Entry) => {
    return x?.parent_author === parent?.author && x?.parent_permlink === parent?.permlink;
  });

  let mutedContent = filtered.filter(
    (item: any) => parent && item.depth === 1 && item.parent_author === parent.author
  );

  let unmutedContent = filtered.filter((md: any) =>
    mutedContent.every((fd: any) => fd.post_id !== md.post_id)
  );

  const arr = [...mutedContent, ...unmutedContent];

  return (
    <ul className="pl-12" id="comments">
      {arr?.map((comment: any, index: number) => (
        <div key={`parent-${comment.post_id}-index-${index}`}>
          <CommentListItem
            comment={comment}
            key={`${comment.post_id}-item-${comment.depth}-index-${index}`}
          />
          {comment.children > 0 ? (
            <CommentList
              data={data}
              parent={comment}
              key={`${comment.post_id}-list-${comment.depth}-index-${index}`}
            />
          ) : null}
        </div>
      ))}
    </ul>
  );
};
export default CommentList;
