import CommentListItem from '@/blog/components/comment-list-item';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { useMemo } from 'react';

const CommentList = ({
  highestAuthor,
  highestPermlink,
  permissionToMute,
  data,
  parent,
  parent_depth,
  mutedList,
  flagText,
  discussionPermlink
}: {
  highestAuthor: string;
  highestPermlink: string;
  permissionToMute: Boolean;
  data?: Entry[];
  parent: Entry;
  parent_depth: number;
  mutedList: IFollowList[];
  flagText: string | undefined;
  discussionPermlink: string;
}) => {
  const router = useRouter();
  const arr = useMemo(() => {
    if (!data || !parent) return undefined;
    const filtered = data.filter(
      (x) => x?.parent_author === parent?.author && x?.parent_permlink === parent?.permlink
    );

    const mutedContent = filtered.filter(
      (item) => parent && item.depth === 1 && item.parent_author === parent.author
    );
    const unmutedContent = filtered.filter((md) => mutedContent.every((fd) => fd.post_id !== md.post_id));
    return [...mutedContent, ...unmutedContent];
  }, [JSON.stringify(data), JSON.stringify(parent)]);
  return (
    <ul data-testid='comment-list'>
      <>
        {!!arr
          ? arr.map((comment: Entry, index: number) => (
              <div
                key={`parent-${comment.post_id}-index-${index}`}
                className={clsx(
                  'pl-2',
                  {
                    'm-2 border-2 border-red-600 bg-green-50 p-2 dark:bg-slate-950':
                      router.asPath.includes(`@${comment.author}/${comment.permlink}`) && comment.depth < 8
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
                  discussionPermlink={discussionPermlink}
                />
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
                  discussionPermlink={discussionPermlink}
                />
              </div>
            ))
          : null}
      </>
    </ul>
  );
};
export default CommentList;
