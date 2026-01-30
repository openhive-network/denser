import { getQueryClient } from '@/blog/lib/react-query';
import Content from './content';
import { getListCommunityRoles } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const Page = async ({ params }: { params: Promise<{ tag: string }> }) => {
  const { tag } = await params;
  const queryClient = getQueryClient();
  try {
    await queryClient.prefetchQuery({
      queryKey: ['community', tag],
      queryFn: () => getListCommunityRoles(tag)
    });
  } catch (error) {
    logger.error(error, 'Error in Page:');
  }
  return <Content community={tag} />;
};

export default Page;
