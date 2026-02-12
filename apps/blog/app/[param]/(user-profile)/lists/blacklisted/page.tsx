import { getFollowList } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';
import BlacklistedUsersContent from './content';

const logger = getLogger('app');
const type = 'blacklisted';

interface PageProps {
  params: {
    param: string;
  };
}
const BlacklistedUsersPage = async ({ params }: PageProps) => {
  const { param } = params;
  const username = param.replace('%40', '');

  let initialData = null;
  try {
    initialData = (await getFollowList(username, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching blacklisted list:');
  }

  return <BlacklistedUsersContent param={param} initialData={initialData} />;
};
export default BlacklistedUsersPage;
