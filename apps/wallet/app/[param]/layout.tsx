import { ReactNode } from 'react';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';
import { getQueryClient } from '@/wallet/lib/react-query';
import ProfileLayout from '@/wallet/components/profile-layout';

const logger = getLogger('app');

/**
 * Fetches the account's profile on the server, so the profile header is part of the server HTML
 * instead of a spinner until the client has fetched it. When the fetch fails the client fetches
 * the profile itself, as without this prefetch.
 */
export default async function ParamLayout(props: { children: ReactNode; params: Promise<{ param: string }> }) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    return <ProfileLayout>{props.children}</ProfileLayout>;
  }

  const username = param.slice(1);
  const queryClient = getQueryClient();
  try {
    await queryClient.fetchQuery(['profileData', username], () => getAccountFull(username));
  } catch (error) {
    logger.error(error, 'Prefetching the profile of %s failed', username);
  }
  const dehydratedState = dehydrate(queryClient);
  queryClient.clear();

  return (
    <Hydrate state={dehydratedState}>
      <ProfileLayout>{props.children}</ProfileLayout>
    </Hydrate>
  );
}
