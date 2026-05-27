import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Community } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';

/**
 * Reflect a subscribe/unsubscribe in the explorer's cached community lists so
 * `CommunitiesListItem` (which derives `isSubscribed` from
 * `community.context.subscribed`) flips. The list is cached per
 * `['communitiesList', sort, query, observer]`; without this its `useEffect`
 * recomputes `isSubscribed` from a stale `context.subscribed` and snaps the
 * card back to its pre-action state. Mirrors the per-community
 * `['community', X]` optimistic write the hooks already do.
 */
function patchCommunitiesListCache(
  queryClient: QueryClient,
  community: string,
  subscribed: boolean
): void {
  queryClient.getQueriesData<Community[]>({ queryKey: ['communitiesList'] }).forEach(([key, list]) => {
    if (!Array.isArray(list)) return;
    queryClient.setQueryData(
      key,
      list.map((c) => (c.name === community ? { ...c, context: { ...c.context, subscribed } } : c))
    );
  });
}

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
      // Find the actual cached community query (key includes observer as 3rd element)
      const communityQueryEntry = queryClient
        .getQueriesData<Community>({ queryKey: ['community', community] })
        .find(([, data]) => !!data);
      const prevCommunityData = communityQueryEntry?.[1];
      const communityQueryKey = communityQueryEntry?.[0];
      const response = {
        ...params,
        broadcastResult,
        prevUserSubscriptionData,
        prevCommunityData,
        communityQueryKey
      };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { community, username, communityTitle, prevUserSubscriptionData, prevCommunityData, communityQueryKey } =
        data;
      if (prevUserSubscriptionData) {
        const updatedSubscriptions = [...prevUserSubscriptionData, [community, communityTitle, 'guest', '']];
        queryClient.setQueryData(['subscriptions', username], updatedSubscriptions);
      }
      if (prevCommunityData && communityQueryKey) {
        const updatedCommunity = {
          ...prevCommunityData,
          context: {
            subscribed: true,
            role: 'guest',
            title: '',
            _temporary: true
          }
        };
        queryClient.setQueryData(communityQueryKey, updatedCommunity);
      }
      patchCommunitiesListCache(queryClient, community, true);
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
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useSubscribeMutation',
        params: variables
      });
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
      // Find the actual cached community query (key includes observer as 3rd element)
      const communityQueryEntry = queryClient
        .getQueriesData<Community>({ queryKey: ['community', community] })
        .find(([, data]) => !!data);
      const prevCommunityData = communityQueryEntry?.[1];
      const communityQueryKey = communityQueryEntry?.[0];
      const response = { ...params, broadcastResult, prevUserSubscriptionData, prevCommunityData, communityQueryKey };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { community, username, prevUserSubscriptionData, prevCommunityData, communityQueryKey } = data;
      if (prevUserSubscriptionData) {
        const updatedSubscriptions = prevUserSubscriptionData.filter((sub) => sub[0] !== community);
        queryClient.setQueryData(['subscriptions', username], updatedSubscriptions);
      }
      if (prevCommunityData && communityQueryKey) {
        const updatedCommunity = {
          ...prevCommunityData,
          context: {
            subscribed: false,
            role: '',
            title: '',
            _temporary: true
          }
        };
        queryClient.setQueryData(communityQueryKey, updatedCommunity);
      }
      patchCommunitiesListCache(queryClient, community, false);
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
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useUnsubscribeMutation',
        params: variables
      });
    }
  });

  return unsubscribeMutation;
}
