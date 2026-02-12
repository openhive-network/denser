import { getFollowList } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';
import FollowedBlacklistContent from './content';

const logger = getLogger('app');
const type = 'follow_blacklist';

interface PageProps {
  params: {
    param: string;
  };
}
const FollowedBlacklistPage = async ({ params }: PageProps) => {
  const { param } = params;
  const username = param.replace('%40', '');

  let initialData = null;
  try {
    initialData = (await getFollowList(username, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching followed blacklists:');
  }

  return <FollowedBlacklistContent param={param} initialData={initialData} />;
};
export default FollowedBlacklistPage;
