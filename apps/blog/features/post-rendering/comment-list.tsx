'use client';

import CommentListItem from '@/blog/features/post-rendering/comment-list-item';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { Button } from '@ui/components/button';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';

const COMMENTS_PER_PAGE = 50;

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
  const { t } = useTranslation('common_blog');
  const [markedHash, setMarkedHash] = useState<string>("");
  const [displayLimit, setDisplayLimit] = useState(COMMENTS_PER_PAGE);
  const isRootLevel = parent.depth === 0;

  useEffect(() => {
  if (typeof window !== "undefined") {
    setMarkedHash(window.location.hash);
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
  }, [JSON.stringify(data), JSON.stringify(parent)]);

  // Only limit at root level to prevent browser crash with 1000+ comments
  const visibleComments = isRootLevel && arr ? arr.slice(0, displayLimit) : arr;
  const hasMoreComments = isRootLevel && arr && arr.length > displayLimit;
  const remainingCount = arr ? arr.length - displayLimit : 0;

  return (
    <ul data-testid="comment-list">
      <>
        {!!visibleComments
          ? visibleComments.map((comment: Entry, index: number) => (
              <div
                key={`parent-${comment.post_id}-index-${index}`}
                className={clsx(
                  'pl-2',
                  {
                    'm-2 border-2 border-red-600 bg-green-50 p-2 dark:bg-slate-950':
                      markedHash?.includes(`@${comment.author}/${comment.permlink}`) && comment.depth < 8
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
        {hasMoreComments && (
          <li className="my-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setDisplayLimit((prev) => prev + COMMENTS_PER_PAGE)}
              data-testid="show-more-comments"
            >
              {t('post_content.comments.show_more', { count: remainingCount })}
            </Button>
          </li>
        )}
      </>
    </ul>
  );
};
export default CommentList;
