import { getFollowList } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';
import MutedContent from './content';

const logger = getLogger('app');
const type = 'muted';

interface PageProps {
  params: {
    param: string;
  };
}
const MutedPage = async ({ params }: PageProps) => {
  const { param } = params;
  const username = param.replace('%40', '');

  let initialData = null;
  try {
    initialData = (await getFollowList(username, type)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching muted list:');
  }

  return <MutedContent param={param} initialData={initialData} />;
};
export default MutedPage;
