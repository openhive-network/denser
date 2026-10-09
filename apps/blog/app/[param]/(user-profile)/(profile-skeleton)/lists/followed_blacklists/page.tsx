import { getFollowList } from '@transaction/lib/bridge-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import FollowedBlacklistContent from './content';

const logger = getLogger('app');
const type = 'follow_blacklist';

const FollowedBlacklistPage = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  let initialData = null;
  try {
    initialData = (await getFollowList(username, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching followed blacklists:');
  }

  return <FollowedBlacklistContent param={params.param} initialData={initialData} />;
};
export default FollowedBlacklistPage;
