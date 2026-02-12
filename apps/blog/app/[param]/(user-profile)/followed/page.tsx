import FollowedContent from './content';
import { getFollowing } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const LIMIT = 50;

const FollowedUsersPage = async ({ params }: { params: { param: string } }) => {
  const username = params.param.replace('%40', '');

  let initialFollowing = null;
  try {
    initialFollowing = (await getFollowing({ account: username, start: '', limit: LIMIT })) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching following list:');
  }

  return <FollowedContent username={username} initialFollowing={initialFollowing} />;
};

export default FollowedUsersPage;
