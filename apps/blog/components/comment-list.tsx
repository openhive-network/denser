'use client';

import CommentListItem from '@/blog/components/comment-list-item';
import { Entry, IFollowList } from '@transaction/lib/bridge';
import clsx from 'clsx';

const CommentList = ({
  highestAuthor,
  highestPermlink,
  permissionToMute,
  data,
  parent,
  parent_depth,
  mutedList,
  flagText
}: {
  highestAuthor: string;
  highestPermlink: string;
  permissionToMute: Boolean;
  data: Entry[];
  parent: Entry;
  parent_depth: number;
  mutedList: IFollowList[];
  flagText: string | undefined;
}) => {
  let filtered = data.filter((x: Entry) => {
    return x?.parent_author === parent?.author && x?.parent_permlink === parent?.permlink;
  });

  let mutedContent = filtered.filter(
    (item: Entry) => parent && item.depth === 1 && item.parent_author === parent.author
  );

  let unmutedContent = filtered.filter((md: Entry) =>
    mutedContent.every((fd: Entry) => fd.post_id !== md.post_id)
  );
  const arr = [...mutedContent, ...unmutedContent];
  return (
    <ul>
      <>
        {arr?.map((comment: Entry, index: number) => (
          <div
            key={`parent-${comment.post_id}-index-${index}`}
            className={clsx(
              'pl-2',
              {
                'm-2 border-2 border-red-600 bg-green-50 p-2 dark:bg-slate-950':
                  highestPermlink.includes(`@${comment.author}/${comment.permlink}`) && comment.depth < 8
              },
              { 'pl-3 sm:pl-12': comment.depth > 1 }
            )}
          >
            <CommentListItem
              parentPermlink={highestPermlink}
              parentAuthor={highestAuthor}
              permissionToMute={permissionToMute}
              comment={comment}
              key={`${comment.post_id}-item-${comment.depth}-index-${index}`}
              parent_depth={parent_depth}
              mutedList={mutedList}
              flagText={flagText}
            />
            {comment.children > 0 ? (
              <CommentList
                flagText={flagText}
                highestAuthor={highestAuthor}
                highestPermlink={highestPermlink}
                permissionToMute={permissionToMute}
                mutedList={mutedList}
                data={data}
                parent={comment}
                key={`${comment.post_id}-list-${comment.depth}-index-${index}`}
                parent_depth={parent_depth}
              />
            ) : null}
          </div>
        ))}
      </>
    </ul>
  );
};
export default CommentList;
