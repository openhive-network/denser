import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type FlagParams = { community: string; username: string; permlink: string; notes: string };

export const useFlagMutation = () =>
  useOperationMutation({
    name: 'useFlagMutation',
    run: ({ community, username, permlink, notes }: FlagParams) =>
      transactionService.flag(community, username, permlink, notes, OBSERVE),
    successToast: (_data, { community }) => ({
      title: 'Flag transaction successful',
      description: `You have flagged the post in ${community}.`
    }),
    reportErrors: false
  });
