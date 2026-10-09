import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type ReblogParams = { author: string; permlink: string; username: string };

export const useReblogMutation = () =>
  useOperationMutation({
    name: 'useReblogMutation',
    run: ({ author, permlink }: ReblogParams) => transactionService.reblog(author, permlink, OBSERVE),
    onSuccess: (_data, { author, permlink, username }, queryClient) => {
      queryClient.setQueriesData({ queryKey: ['PostRebloggedBy', author, permlink, username] }, true);
    },
    successToast: () => ({
      title: 'Reblog successful',
      description: 'You have successfully reblogged the post.'
    }),
    invalidate: ({ author, permlink, username }) => [['PostRebloggedBy', author, permlink, username]],
    invalidateDelays: [4000]
  });
