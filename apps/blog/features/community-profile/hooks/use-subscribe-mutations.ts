import type { TFunction } from 'i18next';
import { useTranslation } from '@/blog/i18n/client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { TransactionNotConfirmedError } from '@transaction/lib/transaction-inclusion';
import { handleError } from '@ui/lib/handle-error';
import {
  OBSERVE,
  useOperationMutation,
  type OperationToast
} from '@ui/components/hooks/use-operation-mutation';
import { applySubscription, type SubscriptionParams } from '../lib/subscription-cache';

interface SubscriptionChange {
  name: string;
  subscribed: boolean;
  broadcast: typeof transactionService.subscribe;
  updateSubscriptions: (subscriptions: string[][], params: SubscriptionParams) => string[][];
  toast: (t: TFunction<'common_blog'>, community: string) => OperationToast;
}

/** The community as the toast names it: its title, or its id where the title is unknown. */
const communityLabel = ({ community, communityTitle }: SubscriptionParams) => communityTitle || community;

/**
 * Broadcasts the change and waits for its block. A transaction the node took but no block was seen to
 * include in time counts as made, so the button keeps the new state; its error is returned to report.
 */
async function broadcastSubscription(
  change: SubscriptionChange,
  community: string
): Promise<TransactionNotConfirmedError | null> {
  try {
    await change.broadcast(community, OBSERVE);
    return null;
  } catch (error) {
    if (error instanceof TransactionNotConfirmedError) return error;
    throw error;
  }
}

function useSubscriptionMutation(change: SubscriptionChange) {
  const { t } = useTranslation('common_blog');
  return useOperationMutation({
    name: change.name,
    run: ({ community }: SubscriptionParams) => broadcastSubscription(change, community),
    onSuccess: (notConfirmed, params, queryClient) => {
      applySubscription(queryClient, params, change.subscribed, change.updateSubscriptions);
      if (notConfirmed) handleError(notConfirmed, { method: change.name, params });
    },
    successToast: (notConfirmed, params) => (notConfirmed ? null : change.toast(t, communityLabel(params))),
    invalidate: ({ community, username }) => [
      ['communitiesList'],
      ['subscriptions', username],
      ['community', community],
      ['subscribers', community],
      ['AccountNotification', community]
    ],
    invalidateDelays: [5000]
  });
}

export const useSubscribeMutation = () =>
  useSubscriptionMutation({
    name: 'useSubscribeMutation',
    subscribed: true,
    broadcast: transactionService.subscribe,
    updateSubscriptions: (subscriptions, { community, communityTitle = '' }) => [
      ...subscriptions,
      [community, communityTitle, 'guest', '']
    ],
    toast: (t, community) => ({
      title: t('communities.toasts.subscribed_title'),
      description: t('communities.toasts.subscribed_description', { community })
    })
  });

export const useUnsubscribeMutation = () =>
  useSubscriptionMutation({
    name: 'useUnsubscribeMutation',
    subscribed: false,
    broadcast: transactionService.unsubscribe,
    updateSubscriptions: (subscriptions, { community }) =>
      subscriptions.filter((sub) => sub[0] !== community),
    toast: (t, community) => ({
      title: t('communities.toasts.unsubscribed_title'),
      description: t('communities.toasts.unsubscribed_description', { community })
    })
  });
