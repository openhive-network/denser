import { useId } from 'react';
import { cn } from '@hive/ui/lib/utils';
import { Icons } from '@hive/ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useTranslation } from '@/wallet/i18n/client';

/**
 * The vote control of a proposal that has ended: disabled, still showing whether the user `voted`,
 * with a tooltip saying the proposal ended.
 */
export function ProposalEndedVoteButton({ label, voted }: { label: string; voted: boolean }) {
  const { t } = useTranslation('common_wallet');
  const endedId = useId();
  const ended = t('proposals_page.vote_ended');

  return (
    <TooltipProvider>
      <Tooltip>
        {/* A disabled button gets no pointer events, so the tooltip hangs on its wrapper */}
        <TooltipTrigger asChild>
          <span className="flex cursor-not-allowed" data-testid="proposal-vote-ended">
            <button
              type="button"
              className="pointer-events-none relative flex rounded-full"
              aria-label={label}
              aria-describedby={endedId}
              aria-pressed={voted}
              aria-disabled
              disabled
            >
              <Icons.arrowUpCircle
                viewBox="1.7 1.7 20.7 20.7"
                className={cn(
                  'relative inline-flex h-6 w-6 rounded-full bg-white stroke-1 text-red-500 opacity-50 dark:bg-slate-800',
                  { 'bg-red-500! text-white': voted }
                )}
                data-testid="voting-button-icon"
              />
            </button>
            <span id={endedId} className="sr-only">
              {ended}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{ended}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
