'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { commentsSectionClasses } from '@/blog/lib/post-layout-classes';
import CommentList from './comment-list';
import CommentSelectFilter from './comment-select-filter';
import { Button } from '@ui/components/button';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { Label } from '@ui/components/label';
import TooltipContainer from '@ui/components/tooltip-container';
import { Entry, IFollowList } from '@hive/common-hiveio-packages/wax';

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
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
  commentsPage: number;
  setCommentsPage: (page: number | ((prev: number) => number)) => void;
}

const CommentsSection = memo(function CommentsSection({
  postData,
  paginatedDiscussionState,
  userCanModerate,
  mutedList,
  flagText,
  discussionAuthor,
  discussionPermlink,
  observer,
  commentsPage,
  setCommentsPage
}: CommentsSectionProps) {
  const { t } = useTranslation('common_blog');
  const sectionRef = useRef<HTMLDivElement>(null);
  const prevCommentsPageRef = useRef(commentsPage);
  const [filteringEnabled, setFilteringEnabled] = useState(true);

  const hiddenCount = useMemo(() => {
    return paginatedDiscussionState.comments.filter((comment) => {
      // Skip the post itself (only count its replies)
      if (comment.author === postData.author && comment.permlink === postData.permlink) return false;
      const isMutedByViewer = mutedList?.some((x) => x.name === comment.author);
      return comment.stats?.gray || isMutedByViewer;
    }).length;
  }, [paginatedDiscussionState.comments, mutedList, postData.author, postData.permlink]);

  useEffect(() => {
    if (prevCommentsPageRef.current !== commentsPage) {
      prevCommentsPageRef.current = commentsPage;
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [commentsPage]);

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
    <div ref={sectionRef} className={commentsSectionClasses}>
      <div className="my-1 flex items-center justify-between" translate="no">
        <TooltipContainer title={t('select_sort.sort_comments.filter_tooltip')}>
          <div className="flex items-center gap-1.5">
            <CheckboxPrimitive.Root
              id="comment-filter"
              checked={filteringEnabled}
              onCheckedChange={(checked) => setFilteringEnabled(checked === true)}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background data-[state=checked]:text-primary data-[state=checked]:hover:text-primary"
            >
              {filteringEnabled ? (
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ShieldOff className="h-5 w-5" aria-hidden="true" />
              )}
            </CheckboxPrimitive.Root>
            <Label
              htmlFor="comment-filter"
              className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
            >
              {t('select_sort.sort_comments.filter_short_label')}
              {filteringEnabled && hiddenCount > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums">
                  {t('select_sort.sort_comments.filtered_count', { count: hiddenCount })}
                </span>
              )}
              {!filteringEnabled && (
                <span className="text-[11px] italic">{t('select_sort.sort_comments.filter_off')}</span>
              )}
            </Label>
          </div>
        </TooltipContainer>
        <div className="flex items-center">
          <span className="pr-1">{t('select_sort.sort_comments.sort')}</span>
          <CommentSelectFilter />
        </div>
      </div>
      <CommentList
        highestAuthor={postData.author}
        highestPermlink={postData.permlink}
        permissionToMute={userCanModerate}
        mutedList={mutedList}
        data={paginatedDiscussionState.comments}
        flagText={flagText}
        filteringEnabled={filteringEnabled}
        parent={postData}
        parent_depth={postData.depth}
        discussionAuthor={discussionAuthor}
        discussionPermlink={discussionPermlink}
        observer={observer}
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
