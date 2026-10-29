import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from '@/blog/i18n/client';

export const TooltipContainer = ({
  children,
  loading,
  text,
  dataTestId,
  afterPayout
}: {
  children: ReactNode;
  loading: boolean;
  text: string;
  dataTestId: string;
  afterPayout?: boolean;
}) => {
  const { t } = useTranslation('common_blog');
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger data-testid={dataTestId} disabled={loading} asChild>
          <span className="cursor-pointer">{children}</span>
        </TooltipTrigger>
        {/* A tooltip closed a frame after it opened, before its enter animation started, is kept
            mounted by Radix until that animation ends. It is then still the topmost layer, so an Esc
            meant for the weight popover or removal dialog under it would be swallowed. Without an
            animation once closed it unmounts at once. */}
        <TooltipContent
          data-testid={dataTestId + '-tooltip'}
          className="flex flex-col items-center justify-center data-[state=closed]:animate-none"
        >
          <div className="font-bold">{text}</div>
          {afterPayout && (
            <div className="text-xs text-destructive opacity-80">
              {t('cards.post_card.vote_after_payout_note')}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
