import Content from './content';
import { getListCommunityRoles } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const Page = async (props: { params: Promise<{ tag: string }> }) => {
  const params = await props.params;
  let initialData = null;
  try {
    initialData = (await getListCommunityRoles(params.tag)) ?? null;
  } catch (error) {
    logger.error(error, 'Error fetching community roles:');
  }
  return <Content community={params.tag} initialData={initialData} />;
};

export default Page;
