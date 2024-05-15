import { IHiveChainInterface } from '@hiveio/wax';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { getManabar } from '@transaction/lib/hive';
import { hiveChainService } from '@transaction/lib/hive-chain-service'
import { useEffect, useState } from 'react';

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
  const [hiveChain, setHiveChain] = useState<IHiveChainInterface | null>();

useEffect(() => {
  (async () => {
    try {
      // await async "fetchBooks()" function
      const chain = await hiveChainService.getHiveChain()
      setHiveChain(chain);
    } catch (err) {
      console.log('Error occured when awaiting hiveChainService');
    }
  })();
}, []);

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
