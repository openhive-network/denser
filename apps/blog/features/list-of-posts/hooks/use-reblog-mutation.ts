import { useTranslation } from '@/blog/i18n/client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type ReblogParams = { author: string; permlink: string; username: string };

export const useReblogMutation = () => {
  const { t } = useTranslation('common_blog');
  return useOperationMutation({
    name: 'useReblogMutation',
    run: ({ author, permlink }: ReblogParams) => transactionService.reblog(author, permlink, OBSERVE),
    onSuccess: (_data, { author, permlink, username }, queryClient) => {
      queryClient.setQueriesData({ queryKey: ['PostRebloggedBy', author, permlink, username] }, true);
    },
    successToast: () => ({
      title: t('alert_dialog_reblog.toast_title'),
      description: t('alert_dialog_reblog.toast_description')
    }),
    invalidate: ({ author, permlink, username }) => [['PostRebloggedBy', author, permlink, username]],
    invalidateDelays: [4000]
  });
};
