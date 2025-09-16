import { getQueryClient } from '@/blog/lib/react-query';
import Content from './content';
import { getListCommunityRoles } from '@transaction/lib/bridge-api';

const Page = async ({ params }: { params: { tag: string } }) => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['community', params.tag],
    queryFn: () => getListCommunityRoles(params.tag)
  });

  return <Content community={params.tag} />;
};

export default Page;
