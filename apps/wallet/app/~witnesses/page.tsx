import { Metadata } from 'next';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getLogger } from '@ui/lib/logging';
import { getQueryClient } from '@/wallet/lib/react-query';
import { getWitnessList, WITNESS_LIST_QUERY_KEY } from '@/wallet/lib/witness-list';
import WitnessesPage from './witnesses-page';

const logger = getLogger('app');

export const metadata: Metadata = {
  title: { absolute: 'Hive Wallet - Witnesses' }
};

/**
 * Fetches the witness list on the server, so its rows are part of the server HTML. When the fetch
 * fails the client fetches the list itself, as without this prefetch.
 */
export default async function Page() {
  const queryClient = getQueryClient();
  try {
    await queryClient.fetchQuery({ queryKey: WITNESS_LIST_QUERY_KEY, queryFn: getWitnessList });
  } catch (error) {
    logger.error(error, 'Prefetching the witness list failed');
  }
  const dehydratedState = dehydrate(queryClient);
  queryClient.clear();

  return (
    <HydrationBoundary state={dehydratedState}>
      <WitnessesPage />
    </HydrationBoundary>
  );
}
