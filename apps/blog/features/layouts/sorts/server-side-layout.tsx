import { getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getCommunities, getSubscriptions } from '@transaction/lib/bridge-api';
import { ReactNode } from 'react';
import { getLogger } from '@ui/lib/logging';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import {
  ObserverProvider,
  InitialCommunitiesProvider,
  InitialSubscriptionsProvider
} from '@/blog/components/observer-provider';

const sort = 'rank';
const query = null;

const logger = getLogger('app');

const ServerSideLayout = async ({ children }: { children: ReactNode }) => {
  const observer = await getObserverFromCookies();
  const isLoggedIn = observer !== DEFAULT_OBSERVER;
  // Fetch communities (always) and subscriptions (logged-in) in parallel
  const [communitiesResult, subscriptionsResult] = await Promise.allSettled([
    getCommunities(sort, query, observer),
    isLoggedIn ? getSubscriptions(observer) : Promise.resolve(null)
  ]);
  const communitiesData =
    communitiesResult.status === 'fulfilled' ? (communitiesResult.value ?? null) : null;
  if (communitiesResult.status === 'rejected') {
    logger.error(communitiesResult.reason, 'Error fetching communities in ServerSideLayout:');
  }
  const subscriptionsData: string[][] | null =
    subscriptionsResult.status === 'fulfilled' ? (subscriptionsResult.value ?? null) : null;
  if (subscriptionsResult.status === 'rejected') {
    logger.error(subscriptionsResult.reason, 'Error fetching subscriptions in ServerSideLayout:');
  }
  return (
    <ObserverProvider value={observer}>
      <InitialCommunitiesProvider value={communitiesData}>
        <InitialSubscriptionsProvider value={subscriptionsData}>
          {children}
        </InitialSubscriptionsProvider>
      </InitialCommunitiesProvider>
    </ObserverProvider>
  );
};

export default ServerSideLayout;
