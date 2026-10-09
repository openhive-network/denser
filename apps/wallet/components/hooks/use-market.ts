import { getMarketStatistics } from '@/wallet/lib/hive';
import { convertStringToBig } from '@ui/lib/helpers';
import { useQuery } from '@tanstack/react-query';

export const useMarket = () => {
  return useQuery({
    queryKey: ['tickerData'],
    queryFn: () => getMarketStatistics(),
    select: (data) => {
      return {
        ...data,
        lowest_ask: convertStringToBig(data.lowest_ask),
        highest_bid: convertStringToBig(data.highest_bid)
      };
    }
  });
};
