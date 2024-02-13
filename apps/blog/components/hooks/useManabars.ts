import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useHiveChainContext } from '../hive-chain-context';
import { getManabar } from '@/blog/lib/hive';

interface SingleManabar {
  max: string;
  current: string;
  percentageValue: number;
  cooldown: Date;
}

interface Manabars {
  upvote: SingleManabar;
  downvote: SingleManabar;
  rc: SingleManabar;
}

const useManabars = (accountName?: string) => {
  const { hiveChain } = useHiveChainContext();

  const {
    data: manabarsData,
    isLoading: manabarsDataLoading,
    isError: manabarsDataError
  }: UseQueryResult<Manabars | null> = useQuery({
    queryKey: ['manabars', accountName],
    queryFn: () => getManabar(accountName!, hiveChain!),
    enabled: !!accountName && !!hiveChain,
    refetchOnWindowFocus: false
  });

  return { manabarsData, manabarsDataLoading, manabarsDataError };
};

export default useManabars;
