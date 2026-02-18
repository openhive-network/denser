'use client';

import { CircleSpinner } from 'react-spinners-kit';
import { cn } from '@ui/lib/utils';
import { Icons } from '@ui/components/icons';
import { handleError } from '@ui/lib/handle-error';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useRebloggedByQuery } from './hooks/use-reblogged-by-query';
import { useReblogMutation } from './hooks/use-reblog-mutation';
import { ReblogDialog } from './reblog-dialog';
import { useTranslation } from '@/blog/i18n/client';

/**
 * Interactive reblog trigger for individual post pages.
 *
 * This component pre-fetches the reblog status and shows the icon
 * state immediately. For list pages, ReblogDialog is used directly
 * with a lazy query instead.
 *
 * This component:
 * - Makes API call to check if user has reblogged
 * - Shows interactive icon that changes color based on reblog status
 * - Opens confirmation dialog when clicked
 * - Handles reblog mutation
 */
const ReblogTrigger = ({
  author,
  permlink,
  dataTestidTooltipContent,
  dataTestidTooltipIcon,
  isReblogged: isRebloggedProp,
  showLabel = false
}: {
  author: string;
  permlink: string;
  dataTestidTooltipContent: string;
  dataTestidTooltipIcon: string;
  /** Optional: pass from parent to avoid duplicate queries when multiple triggers exist */
  isReblogged?: boolean;
  /** Show label with styled button wrapper */
  showLabel?: boolean;
}) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  // Skip query if isReblogged is provided from parent
  const { data: isRebloggedQuery } = useRebloggedByQuery(
    isRebloggedProp !== undefined ? '' : author,
    isRebloggedProp !== undefined ? '' : permlink,
    isRebloggedProp !== undefined ? '' : user.username
  );
  const isReblogged = isRebloggedProp ?? isRebloggedQuery;

  const reblogMutation = useReblogMutation();

  const reblog = async () => {
    try {
      await reblogMutation.mutateAsync({ author, permlink, username: user.username });
    } catch (error) {
      handleError(error, { method: 'reblog', params: { author, permlink, username: user.username } });
    }
  };

  // Receive output from dialog and do action according to user's
  // response.
  const dialogAction = (dialogResponse: boolean): void => {
    if (dialogResponse) {
      reblog();
    }
  };

  if (showLabel) {
    return (
      <ReblogDialog author={author} permlink={permlink} action={dialogAction} isReblogged={isReblogged}>
        <button
          disabled={isReblogged || reblogMutation.isLoading}
          className={cn(
            'flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background-secondary hover:text-foreground',
            {
              'cursor-default text-destructive': isReblogged,
              'cursor-not-allowed opacity-50': reblogMutation.isLoading
            }
          )}
        >
          {reblogMutation.isLoading ? (
            <CircleSpinner loading={reblogMutation.isLoading} size={16} color="#dc2626" />
          ) : (
            <Icons.forward
              className={cn('h-4 w-4', {
                'text-destructive': isReblogged
              })}
              data-testid={dataTestidTooltipIcon}
            />
          )}
          <span className="font-medium">
            {isReblogged ? t('cards.post_card.you_reblogged') : t('cards.post_card.reblog')}
          </span>
        </button>
      </ReblogDialog>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger disabled={isReblogged || reblogMutation.isLoading}>
          <ReblogDialog author={author} permlink={permlink} action={dialogAction} isReblogged={isReblogged}>
            {reblogMutation.isLoading ? (
              <CircleSpinner loading={reblogMutation.isLoading} size={18} color="#dc2626" />
            ) : (
              <Icons.forward
                className={cn('h-4 w-4 cursor-pointer', {
                  'text-destructive': isReblogged,
                  'cursor-default': isReblogged
                })}
                data-testid={dataTestidTooltipIcon}
              />
            )}
          </ReblogDialog>
        </TooltipTrigger>
        <TooltipContent data-testid={dataTestidTooltipContent}>
          <p>{isReblogged ? t('cards.post_card.you_reblogged') : t('cards.post_card.reblog')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ReblogTrigger;
