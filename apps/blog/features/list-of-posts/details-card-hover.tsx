'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@hive/ui/components/popover';
import { cn } from '@ui/lib/utils';
import { ReactNode } from 'react';
import { useHoverPopover } from '@/blog/components/hooks/use-hover-popover';
import { useTranslation } from '@/blog/i18n/client';
import type { TrimmedEntry } from './lib/card-entry';
import PayoutHoverContent from './payout-hover-content';

type DetailsCardHoverProps = {
  post: TrimmedEntry;
  children: ReactNode;
  decline?: boolean;
  post_page?: boolean;
};

export default function DetailsCardHover({ post, children, decline, post_page }: DetailsCardHoverProps) {
  const { t } = useTranslation('common_blog');
  const { rootProps, triggerProps, contentProps } = useHoverPopover();

  if (decline) {
    return (
      <div
        className={cn(`flex items-center line-through opacity-50`, { 'text-red-500': post_page })}
        data-testid="post-payout-decline"
        title={t('cards.payout_declined')}
      >
        {'$'}
        {post.payout.toFixed(2)}
      </div>
    );
  }

  return (
    <Popover {...rootProps}>
      <PopoverTrigger
        className="flex items-center"
        aria-label={t('amount_hover_card.show_breakdown', { value: post.payout.toFixed(2) })}
        {...triggerProps}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="flex w-auto flex-col"
        data-testid="payout-post-card-tooltip"
        {...contentProps}
      >
        <PayoutHoverContent post={post} />
      </PopoverContent>
    </Popover>
  );
}
