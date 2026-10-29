import FollowersContent from './content';
import { getFollowers } from '@transaction/lib/hive-api';
import { extractSocialAccountFromParam } from '@/blog/lib/hive-account-route';
import { isLiteDid } from '@/blog/features/lite-account/lite-did';
import LiteFollowList from '@/blog/features/lite-account/lite-follow-list';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const LIMIT = 50;

const FollowersPage = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = await extractSocialAccountFromParam(params.param);
  if (!username) notFound();
  if (isLiteDid(username)) return <LiteFollowList account={username} list="followers" />;

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
