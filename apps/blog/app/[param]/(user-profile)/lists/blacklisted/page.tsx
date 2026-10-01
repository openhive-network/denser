import { getFollowList } from '@transaction/lib/bridge-api';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import { notFound } from 'next/navigation';
import { getLogger } from '@ui/lib/logging';
import BlacklistedUsersContent from './content';

const logger = getLogger('app');
const type = 'blacklisted';

const BlacklistedUsersPage = async (props: { params: Promise<{ param: string }> }) => {
  const params = await props.params;
  const username = extractUsernameFromParam(params.param);
  if (!username) notFound();

  let initialData = null;
  try {
    initialData = (await getFollowList(username, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching blacklisted list:');
  }

  return <BlacklistedUsersContent param={params.param} initialData={initialData} />;
};
export default BlacklistedUsersPage;
