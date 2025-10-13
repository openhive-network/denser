'use client';

import { useRebloggedByQuery } from '@/blog/components/hooks/use-reblogged-by-query';
import { cn } from '@ui/lib/utils';
import { Icons } from '@hive/ui/components/icons';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { useReblogMutation } from './hooks/use-reblog-mutation';
import { CircleSpinner } from 'react-spinners-kit';
import { ReblogDialog } from './reblog-dialog';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '../i18n/client';

const ReblogTrigger = ({
  author,
  permlink,
  dataTestidTooltipContent,
  dataTestidTooltipIcon
}: {
  author: string;
  permlink: string;
  dataTestidTooltipContent: string;
  dataTestidTooltipIcon: string;
}) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const { isLoading: isLoadingReblogData, data: isReblogged } = useRebloggedByQuery(
    author,
    permlink,
    user.username
  );

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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger disabled={isReblogged || reblogMutation.isLoading}>
          <ReblogDialog author={author} permlink={permlink} action={dialogAction}>
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
