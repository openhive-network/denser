import { getFollowList } from '@transaction/lib/bridge-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import FollowedMutedListsContent from './content';

const logger = getLogger('app');
const type = 'follow_muted';

const FollowedMutedListsPage = async ({ params }: { params: { param: string } }) => {
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  let initialData = null;
  try {
    initialData = (await getFollowList(username, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching followed muted lists:');
  }

  return <FollowedMutedListsContent param={params.param} initialData={initialData} />;
};
export default FollowedMutedListsPage;
