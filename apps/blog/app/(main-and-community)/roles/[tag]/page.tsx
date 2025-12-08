import { getQueryClient } from '@/blog/lib/react-query';
import Content from './content';
import { getListCommunityRoles } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const Page = async ({ params }: { params: { tag: string } }) => {
  const queryClient = getQueryClient();
  try {
    await queryClient.prefetchQuery({
      queryKey: ['community', params.tag],
      queryFn: () => getListCommunityRoles(params.tag)
    });
  } catch (error) {
    logger.error(error, 'Error in Page:');
  }
  return <Content community={params.tag} />;
};

export default Page;
