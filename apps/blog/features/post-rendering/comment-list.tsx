'use client';

import CommentCard from '@/blog/features/post-rendering/comment-card';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import clsx from 'clsx';
import { useEffect, useState, useMemo, useCallback, useTransition } from 'react';
import CommentsPagination from '@/blog/features/post-rendering/comments-pagination';
import Loading from '@ui/components/loading';

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
      setMarkedHash(window.location.hash);
    }
  }, []);

  const nbCommentsPerPage = 20;

  const topLevelComments = useMemo(() => {
    if (!data || !parent) return [];
    const filtered = data.filter(
      (x) => x?.parent_author === parent?.author && x?.parent_permlink === parent?.permlink
    );

    const mutedContent = filtered.filter((item) => mutedList?.some((x) => x.name === item.author));

    const unmutedContent = filtered.filter((item) => mutedContent.every((m) => m.post_id !== item.post_id));

    return [...mutedContent, ...unmutedContent];
  }, [data, parent, mutedList]);

  const [isPending, startTransition] = useTransition();
  const [currentReplyPage, setCurrentReplyPage] = useState(1);

  const commentStartIndex = (currentReplyPage - 1) * nbCommentsPerPage;
  const commentEndIndex = commentStartIndex + nbCommentsPerPage;
  const nbReplies = topLevelComments.length;

  const handlePaginationClick = useCallback((page: number) => {
    startTransition(() => {
      setCurrentReplyPage(page);
    });
  }, []);

  const renderReplies = useCallback(
    (parentComment: Entry, depth: number) => {
      if (!data) return null;

      const replies = data.filter(
        (x) => x.parent_author === parentComment.author && x.parent_permlink === parentComment.permlink
      );

      if (!replies.length) return null;

      if (depth >= 7) {
        const firstHiddenReply = replies[0];

        return (
          <div className="mt-2 pl-3 sm:pl-12">
            <a
              href={`/@${firstHiddenReply.author}/${firstHiddenReply.permlink}`}
              className="text-primary underline"
            >
              Load more...
            </a>
          </div>
        );
      }

      return (
        <ul data-testid="comment-list" id={`comment-list-${depth}`}>
          {replies.map((reply) => (
            <li data-testid="comment-list-item" key={reply.post_id} className="pl-3 sm:pl-12">
              <CommentCard
                parentPermlink={highestPermlink}
                parentAuthor={highestAuthor}
                permissionToMute={permissionToMute}
                comment={reply}
                parent_depth={depth}
                mutedList={mutedList}
                flagText={flagText}
                discussionPermlink={discussionPermlink}
                onCommentLinkClick={(hash) => setMarkedHash(hash)}
              />
              {renderReplies(reply, depth + 1)}
            </li>
          ))}
        </ul>
      );
    },
    [data, discussionPermlink, flagText, highestAuthor, highestPermlink, mutedList, permissionToMute]
  );

  return (
    <div>
      {isPending ? (
        <Loading loading={isPending} />
      ) : (
        <>
          {parent_depth === 0 && nbReplies > 0 && (
            <CommentsPagination
              nbComments={nbReplies}
              currentPage={currentReplyPage}
              nbItemsPerPage={nbCommentsPerPage}
              onClick={handlePaginationClick}
            />
          )}

          <ul data-testid="comment-list">
            {topLevelComments.slice(commentStartIndex, commentEndIndex).map((comment) => (
              <li
                data-testid="comment-list-item"
                key={comment.post_id}
                className={clsx(
                  'pl-2',
                  {
                    'm-2 border-2 border-red-600 bg-green-50 p-2 dark:bg-slate-950':
                      markedHash?.includes(`@${comment.author}/${comment.permlink}`) && comment.depth < 8
                  },
                  { 'pl-3 sm:pl-12': comment.depth > 1 }
                )}
              >
                <CommentCard
                  parentPermlink={highestPermlink}
                  parentAuthor={highestAuthor}
                  permissionToMute={permissionToMute}
                  comment={comment}
                  parent_depth={parent_depth}
                  mutedList={mutedList}
                  flagText={flagText}
                  discussionPermlink={discussionPermlink}
                  onCommentLinkClick={(hash) => setMarkedHash(hash)}
                />
                {renderReplies(comment, parent_depth + 1)}
              </li>
            ))}
          </ul>

          {parent_depth === 0 && nbReplies > 0 && (
            <CommentsPagination
              nbComments={nbReplies}
              currentPage={currentReplyPage}
              nbItemsPerPage={nbCommentsPerPage}
              onClick={handlePaginationClick}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CommentList;
