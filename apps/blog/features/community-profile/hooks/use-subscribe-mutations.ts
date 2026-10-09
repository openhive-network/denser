import { transactionService } from '@transaction/lib/lazy-transaction-service';
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
  toast: (params: SubscriptionParams) => OperationToast;
}

function useSubscriptionMutation(change: SubscriptionChange) {
  return useOperationMutation({
    name: change.name,
    run: ({ community }: SubscriptionParams) => change.broadcast(community, OBSERVE),
    onSuccess: (_data, params, queryClient) =>
      applySubscription(queryClient, params, change.subscribed, change.updateSubscriptions),
    successToast: (_data, params) => change.toast(params),
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
    toast: ({ communityTitle }) => ({
      title: 'Subscribed',
      description: `You have successfully subscribed to ${communityTitle}.`
    })
  });

export const useUnsubscribeMutation = () =>
  useSubscriptionMutation({
    name: 'useUnsubscribeMutation',
    subscribed: false,
    broadcast: transactionService.unsubscribe,
    updateSubscriptions: (subscriptions, { community }) =>
      subscriptions.filter((sub) => sub[0] !== community),
    toast: ({ community }) => ({
      title: 'Unsubscribed',
      description: `You have successfully unsubscribed from ${community}.`
    })
  });
