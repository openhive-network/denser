import FollowedContent from './content';
import { getFollowing } from '@transaction/lib/hive-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const LIMIT = 50;

const FollowedUsersPage = async ({ params }: { params: { param: string } }) => {
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  let initialFollowing = null;
  try {
    initialFollowing = (await getFollowing({ account: username, start: '', limit: LIMIT })) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching following list:');
  }

  return <FollowedContent username={username} initialFollowing={initialFollowing} />;
};

export default FollowedUsersPage;
