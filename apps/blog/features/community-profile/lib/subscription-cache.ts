import type { QueryClient } from '@tanstack/react-query';
import { Community } from '@hive/common-hiveio-packages/wax';

export type SubscriptionParams = { community: string; username: string; communityTitle?: string };

/**
 * Reflect a subscribe/unsubscribe in the explorer's cached community lists so
 * `CommunitiesListItem` (which derives `isSubscribed` from
 * `community.context.subscribed`) flips. The list is cached per
 * `['communitiesList', sort, query, observer]`; without this its `useEffect`
 * recomputes `isSubscribed` from a stale `context.subscribed` and snaps the
 * card back to its pre-action state. Mirrors the per-community
 * `['community', X]` optimistic write the hooks already do.
 */
function patchCommunitiesListCache(queryClient: QueryClient, community: string, subscribed: boolean): void {
  queryClient.getQueriesData<Community[]>({ queryKey: ['communitiesList'] }).forEach(([key, list]) => {
    if (!Array.isArray(list)) return;
    queryClient.setQueryData(
      key,
      list.map((c) => (c.name === community ? { ...c, context: { ...c.context, subscribed } } : c))
    );
  });
}

/** Writes a broadcast subscribe/unsubscribe into the subscriptions, community and explorer caches. */
export function applySubscription(
  queryClient: QueryClient,
  params: SubscriptionParams,
  subscribed: boolean,
  updateSubscriptions: (subscriptions: string[][], params: SubscriptionParams) => string[][]
) {
  const { community, username } = params;
  const subscriptions: string[][] | undefined = queryClient.getQueryData(['subscriptions', username]);
  if (subscriptions) {
    queryClient.setQueryData(['subscriptions', username], updateSubscriptions(subscriptions, params));
  }
  // Find the actual cached community query (key includes observer as 3rd element)
  const communityQueryEntry = queryClient
    .getQueriesData<Community>({ queryKey: ['community', community] })
    .find(([, data]) => !!data);
  if (communityQueryEntry) {
    const [communityQueryKey, prevCommunityData] = communityQueryEntry;
    const role = subscribed ? 'guest' : '';
    queryClient.setQueryData(communityQueryKey, {
      ...prevCommunityData,
      context: { subscribed: subscribed, role, title: '', _temporary: true }
    });
  }
  patchCommunitiesListCache(queryClient, community, subscribed);
}
