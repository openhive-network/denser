import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getManabar } from '@transaction/lib/hive';

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
  const {
    data: manabarsData,
    isLoading: manabarsDataLoading,
    isError: manabarsDataError
  }: UseQueryResult<Manabars | null> = useQuery({
    queryKey: ['manabars', accountName],
    queryFn: () => getManabar(accountName!),
    enabled: !!accountName,
    refetchOnWindowFocus: false,
    refetchInterval: 60000 // 1 minute in milliseconds
  });
  return { manabarsData, manabarsDataLoading, manabarsDataError };
};

export default useManabars;
