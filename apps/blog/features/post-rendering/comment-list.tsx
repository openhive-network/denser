'use client';

import CommentListItem from '@/blog/features/post-rendering/comment-list-item';
import { Entry, IFollowList } from '@hive/common-hiveio-packages/wax';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { sanitizeHash } from '@ui/lib/sanitize-url';

/**
 * ThreadLine component for Reddit-style visual thread indicators
 * Shows a vertical line with a curved connector to parent comment
 */
const ThreadLine = ({ isLast }: { isLast: boolean }) => (
  <div className="relative flex-shrink-0 w-5 mr-1 group/thread">
    {/* Vertical line from top to curve junction - connects to parent's line above */}
    <div
      className={clsx(
        'absolute left-0 top-0 h-3 w-0',
        'border-l-2',
        'border-thread-line',
        'transition-colors duration-150'
      )}
    />
    {/* Curved connector - branches off to the comment */}
    <div
      className={clsx(
        'absolute left-0 top-3 w-3 h-3',
        'border-l-2 border-b-2 rounded-bl-lg',
        'border-thread-line',
        'transition-colors duration-150'
      )}
    />
    {/* Vertical line extending down for siblings below */}
    {!isLast && (
      <div
        className={clsx(
          'absolute left-0 top-3 bottom-0 w-0',
          'border-l-2',
          'border-thread-line',
          'transition-colors duration-150'
        )}
      />
    )}
  </div>
);

const CommentList = ({
  highestAuthor,
  highestPermlink,
  permissionToMute,
  data,
  parent,
  parent_depth,
  mutedList,
  flagText,
  discussionAuthor,
  discussionPermlink,
  observer,
  filteringEnabled = true
}: {
  highestAuthor: string;
  highestPermlink: string;
  permissionToMute: Boolean;
  data?: Entry[];
  parent: Entry;
  parent_depth: number;
  mutedList: IFollowList[];
  flagText: string | undefined;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
  filteringEnabled?: boolean;
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
                className={clsx('min-w-0 flex', {
                  'my-2 rounded border-2 border-red-600 bg-green-50 p-2 dark:bg-slate-950':
                    markedHash?.includes(`@${comment.author}/${comment.permlink}`) && comment.depth < 8
                })}
              >
                {/* Thread line connector for nested comments (only show for replies to comments, not top-level) */}
                {parent.depth >= 1 && (
                  <ThreadLine isLast={index === arr.length - 1} />
                )}
                <div className="min-w-0 flex-1">
                <CommentListItem
                  parentPermlink={highestPermlink}
                  parentAuthor={highestAuthor}
                  permissionToMute={permissionToMute}
                  comment={comment}
                  key={`${comment.post_id}-item-${comment.depth}-index-${index}`}
                  parent_depth={parent_depth}
                  mutedList={mutedList}
                  flagText={flagText}
                  discussionAuthor={discussionAuthor}
                  discussionPermlink={discussionPermlink}
                  observer={observer}
                  filteringEnabled={filteringEnabled}
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
                    discussionAuthor={discussionAuthor}
                    discussionPermlink={discussionPermlink}
                    observer={observer}
                    filteringEnabled={filteringEnabled}
                  />
                </CommentListItem>
                </div>
              </div>
            ))
          : null}
      </>
    </ul>
  );
};
export default CommentList;
