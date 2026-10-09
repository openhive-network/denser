import CommunityContent from './content';
import { getSubscriptions } from '@transaction/lib/bridge-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

// Keep this segment outside any loading.tsx boundary: a pending Suspense fallback
// streams the list into a hidden chunk that only client JS reveals, so crawlers
// and no-JS visitors would never see it.

const CommunitiesPage = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  let initialData = null;
  try {
    initialData = (await getSubscriptions(username)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching subscriptions:');
  }

  return <CommunityContent username={username} initialData={initialData} />;
};

export default CommunitiesPage;
