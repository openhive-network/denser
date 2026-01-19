import AvatarsContent from './content';
import { getQueryClient } from '@/blog/lib/react-query';
import { dehydrate, Hydrate } from '@tanstack/react-query';
import { getTopWitnesses } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

const AvatarsPage = async () => {
  const queryClient = getQueryClient();
  try {
    await queryClient.prefetchQuery({
      queryKey: ['topWitnesses'],
      queryFn: async () => await getTopWitnesses(20)
    });
  } catch (error) {
    logger.error(error, 'Error in AvatarsPage:');
  }
  return (
    <Hydrate state={dehydrate(queryClient)}>
      <AvatarsContent />
    </Hydrate>
  );
};

export default AvatarsPage;
