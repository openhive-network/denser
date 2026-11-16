'use client';

import { memo } from 'react';
import clsx from 'clsx';
import { Separator } from '@ui/components/separator';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { useTranslation } from '@/blog/i18n/client';
import VotesComponentWrapper from '@/blog/features/votes/votes-component-wrapper';
import DetailsCardHover from '../list-of-posts/details-card-hover';
import DetailsCardVoters from './details-card-voters';

/** A comment footer's votes, payout and voters, which do not depend on the signed-in user. */
export const CommentFooterStats = memo(function CommentFooterStats({ comment }: { comment: Entry }) {
  const { t } = useTranslation('common_blog');

  return (
    <>
      <VotesComponentWrapper post={comment} type="comment" />
      <DetailsCardHover
        post={comment}
        decline={parseFloat(comment.max_accepted_payout) === 0}
      >
        <span
          data-testid="comment-card-footer-payout"
          className={clsx(
            'flex items-center hover:cursor-pointer hover:text-destructive',
            {
              'line-through opacity-50':
                parseFloat(comment.max_accepted_payout) === 0
            }
          )}
        >
          {'$'}
          {comment.payout.toFixed(2)}
        </span>
      </DetailsCardHover>
      <Separator orientation="vertical" className="h-5" />
      {!!comment.stats && comment.stats.total_votes > 0 ? (
        <>
          <div className="flex items-center">
            <DetailsCardVoters
              post={comment}
              className="hover:text-destructive"
              label={
                comment.stats.total_votes > 1
                  ? t('cards.post_card.votes', { votes: comment.stats.total_votes })
                  : t('cards.post_card.vote')
              }
            />
          </div>
          <Separator orientation="vertical" className="h-5" />
        </>
      ) : null}
    </>
  );
});
