import { getQueryClient } from '@/blog/lib/react-query';
import RedirectContent from './content';
import { getPost } from '@transaction/lib/bridge-api';
import { dehydrate, Hydrate } from '@tanstack/react-query';

const Page = async ({ params: { param, p2 } }: { params: { param: string; p2: string } }) => {
  const queryClient = getQueryClient();
  const username = param.replace('%40', '');

  await queryClient.prefetchQuery({
    queryKey: ['postData', username, p2],
    queryFn: () => getPost(username, p2)
  });

  return (
    <Hydrate state={dehydrate(queryClient)}>
      <RedirectContent />
    </Hydrate>
  );
};
export default Page;
