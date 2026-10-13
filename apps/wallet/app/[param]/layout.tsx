import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getLogger } from '@ui/lib/logging';
import { getQueryClient } from '@/wallet/lib/react-query';
import ProfileLayout from '@/wallet/components/profile-layout';
import { getRouteAccount } from '@/wallet/lib/account-page-metadata';

const logger = getLogger('app');

/**
 * Fetches the account's profile on the server, so the profile header is part of the server HTML
 * instead of a spinner until the client has fetched it. When the fetch fails the client fetches
 * the profile itself, as without this prefetch. An account the chain does not have is a 404.
 */
export default async function ParamLayout(props: { children: ReactNode; params: Promise<{ param: string }> }) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    return <ProfileLayout>{props.children}</ProfileLayout>;
  }

  const username = param.slice(1);
  const queryClient = getQueryClient();
  let accountExists = true;
  try {
    const account = await queryClient.fetchQuery({
      queryKey: ['profileData', username],
      queryFn: () => getRouteAccount(username)
    });
    accountExists = Boolean(account.name);
  } catch (error) {
    logger.error(error, 'Prefetching the profile of %s failed', username);
  }
  if (!accountExists) {
    notFound();
  }
  const dehydratedState = dehydrate(queryClient);
  queryClient.clear();

  return (
    <HydrationBoundary state={dehydratedState}>
      <ProfileLayout>{props.children}</ProfileLayout>
    </HydrationBoundary>
  );
}
