'use client';

import CommentListItem from '@/blog/features/post-rendering/comment-list-item';
import { Entry, IFollowList } from '@hive/common-hiveio-packages/wax';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { sanitizeHash } from '@ui/lib/sanitize-url';

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
  const [markedHash, setMarkedHash] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Security: Sanitize hash to prevent potential injection
      const hash = sanitizeHash(window.location.hash);
      if (hash) {
        setMarkedHash(hash);
      }
    }
  }, []);

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
  }, [data, parent?.author, parent?.permlink]);
  return (
    <ul data-testid="comment-list" className="w-full min-w-0 overflow-hidden">
      <>
        {!!arr
          ? arr.map((comment: Entry, index: number) => (
              <div
                key={`parent-${comment.post_id}-index-${index}`}
                className={clsx('min-w-0 pl-3', {
                  'my-2 rounded border-2 border-red-600 bg-green-50 p-2 dark:bg-slate-950':
                    markedHash?.includes(`@${comment.author}/${comment.permlink}`) && comment.depth < 8
                })}
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
                  onCommnentLinkClick={(hash) => setMarkedHash(hash)}
                >
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
                </CommentListItem>
              </div>
            ))
          : null}
      </>
    </ul>
  );
};
export default CommentList;
