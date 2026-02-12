import FollowersContent from './content';
import { getFollowers } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const LIMIT = 50;

const FollowersPage = async ({ params }: { params: { param: string } }) => {
  const username = params.param.replace('%40', '');

  let initialFollowers = null;
  try {
    initialFollowers =
      (await getFollowers({ account: username, start: '', type: 'blog', limit: LIMIT })) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching followers list:');
  }

  return <FollowersContent username={username} initialFollowers={initialFollowers} />;
};

export default FollowersPage;
