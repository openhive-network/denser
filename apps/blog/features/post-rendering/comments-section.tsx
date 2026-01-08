'use client';

import { memo, useCallback } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { commentsSectionClasses } from '@/blog/lib/post-layout-classes';
import CommentList from './comment-list';
import CommentSelectFilter from './comment-select-filter';
import { Button } from '@ui/components/button';
import { Entry, IFollowList } from '@transaction/lib/extended-hive.chain';

interface CommentsSectionProps {
  postData: Entry;
  paginatedDiscussionState: {
    comments: Entry[];
    totalPages: number;
    currentPage: number;
    totalMainComments: number;
  };
  userCanModerate: boolean;
  mutedList: IFollowList[];
  flagText: string | undefined;
  discussionPermlink: string;
  commentsPage: number;
  setCommentsPage: (page: number | ((prev: number) => number)) => void;
}

const CommentsSection = memo(function CommentsSection({
  postData,
  paginatedDiscussionState,
  userCanModerate,
  mutedList,
  flagText,
  discussionPermlink,
  commentsPage,
  setCommentsPage
}: CommentsSectionProps) {
  const { t } = useTranslation('common_blog');

  const handlePrevPage = useCallback(() => {
    setCommentsPage((prev: number) => Math.max(1, prev - 1));
  }, [setCommentsPage]);

  const handleNextPage = useCallback(() => {
    setCommentsPage((prev: number) => Math.min(paginatedDiscussionState.totalPages, prev + 1));
  }, [setCommentsPage, paginatedDiscussionState.totalPages]);

  const handlePageClick = useCallback(
    (pageNum: number) => {
      setCommentsPage(pageNum);
    },
    [setCommentsPage]
  );

  return (
    <div className={commentsSectionClasses}>
      <div className="my-1 flex items-center justify-end" translate="no">
        <span className="pr-1">{t('select_sort.sort_comments.sort')}</span>
        <CommentSelectFilter />
      </div>
      <CommentList
        highestAuthor={postData.author}
        highestPermlink={postData.permlink}
        permissionToMute={userCanModerate}
        mutedList={mutedList}
        data={paginatedDiscussionState.comments}
        flagText={flagText}
        parent={postData}
        parent_depth={postData.depth}
        discussionPermlink={discussionPermlink}
      />
      {paginatedDiscussionState.totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={paginatedDiscussionState.currentPage === 1}
          >
            {t('user_profile.lists.list.previous_button')}
          </Button>
          {Array.from({ length: paginatedDiscussionState.totalPages }, (_, i) => i + 1).map((pageNum) => {
            const showPage =
              pageNum === 1 ||
              pageNum === paginatedDiscussionState.totalPages ||
              (pageNum >= paginatedDiscussionState.currentPage - 2 &&
                pageNum <= paginatedDiscussionState.currentPage + 2);

            if (!showPage) {
              if (
                pageNum === paginatedDiscussionState.currentPage - 3 ||
                pageNum === paginatedDiscussionState.currentPage + 3
              ) {
                return (
                  <span key={pageNum} className="px-2">
                    ...
                  </span>
                );
              }
              return null;
            }

            return (
              <Button
                key={pageNum}
                variant={pageNum === paginatedDiscussionState.currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageClick(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={paginatedDiscussionState.currentPage === paginatedDiscussionState.totalPages}
          >
            {t('user_profile.lists.list.next_button')}
          </Button>
        </div>
      )}
    </div>
  );
});

export default CommentsSection;
