import { useTranslation } from '@/blog/i18n/client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type FlagParams = { community: string; username: string; permlink: string; notes: string };

export const useFlagMutation = () => {
  const { t } = useTranslation('common_blog');
  return useOperationMutation({
    name: 'useFlagMutation',
    run: ({ community, username, permlink, notes }: FlagParams) =>
      transactionService.flag(community, username, permlink, notes, OBSERVE),
    successToast: (_data, { community }) => ({
      title: t('post_content.moderation_toasts.flagged_title'),
      description: t('post_content.moderation_toasts.flagged_description', { community })
    }),
    reportErrors: false
  });
};
