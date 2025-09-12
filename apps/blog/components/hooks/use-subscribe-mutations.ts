import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Community } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes subscribe transaction.
 *
 * @export
 * @return {*}
 */
export function useSubscribeMutation() {
  const queryClient = useQueryClient();
  const subscribeMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; communityTitle: string }) => {
      const { community } = params;
      const broadcastResult = await transactionService.subscribe(community, { observe: true });
      const prevUserSubscriptionData: string[][] | undefined = queryClient.getQueryData([
        'subscriptions',
        params.username
      ]);
      const prevCommunityData: Community | undefined = queryClient.getQueryData(['community', community]);
      const response = { ...params, broadcastResult, prevUserSubscriptionData, prevCommunityData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { community, username, communityTitle, prevUserSubscriptionData, prevCommunityData } = data;
      if (!!prevUserSubscriptionData) {
        const updatedSubscriptions = [...prevUserSubscriptionData, [community, communityTitle, 'guest', '']];
        queryClient.setQueryData(['subscriptions', username], updatedSubscriptions);
      }
      if (!!prevCommunityData) {
        const updatedCommunity = {
          ...prevCommunityData,
          context: {
            subscribed: true,
            role: 'guest',
            title: '',
            _temporary: true
          }
        };
        queryClient.setQueryData(['community', community], updatedCommunity);
      }
    },
    onSuccess: (data) => {
      const { community, username, communityTitle } = data;
      toast({
        title: 'Subscribed',
        description: `You have successfully subscribed to ${communityTitle}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptions', username] });
        queryClient.invalidateQueries({ queryKey: ['community', community] });
        queryClient.invalidateQueries({ queryKey: ['subscribers', community] });
        queryClient.invalidateQueries({ queryKey: ['AccountNotification', community] });
      }, 5000);
    }
  });

  return subscribeMutation;
}

/**
 * Makes unsubscribe transaction.
 *
 * @export
 * @return {*}
 */
export function useUnsubscribeMutation() {
  const queryClient = useQueryClient();
  const unsubscribeMutation = useMutation({
    mutationFn: async (params: { community: string; username: string }) => {
      const { community, username } = params;
      const broadcastResult = await transactionService.unsubscribe(community, { observe: true });
      const prevUserSubscriptionData: string[][] | undefined = queryClient.getQueryData([
        'subscriptions',
        username
      ]);
      const prevCommunityData = queryClient.getQueryData(['community', community]);
      const response = { ...params, broadcastResult, prevUserSubscriptionData, prevCommunityData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { community, username, prevUserSubscriptionData, prevCommunityData } = data;
      if (!!prevUserSubscriptionData) {
        const updatedSubscriptions = prevUserSubscriptionData.filter((sub) => sub[0] !== community);
        queryClient.setQueryData(['subscriptions', username], updatedSubscriptions);
      }
      if (!!prevCommunityData) {
        const updatedCommunity = {
          ...prevCommunityData,
          context: {
            subscribed: false,
            role: '',
            title: '',
            _temporary: true
          }
        };
        queryClient.setQueryData(['community', community], updatedCommunity);
      }
    },
    onSuccess: (data) => {
      const { community, username } = data;
      toast({
        title: 'Unsubscribed',
        description: `You have successfully unsubscribed from ${community}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptions', username] });
        queryClient.invalidateQueries({ queryKey: ['community', community] });
        queryClient.invalidateQueries({ queryKey: ['subscribers', community] });
        queryClient.invalidateQueries({ queryKey: ['AccountNotification', community] });
      }, 5000);
    }
  });

  return unsubscribeMutation;
}
