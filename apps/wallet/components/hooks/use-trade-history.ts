import { getRecentTrades } from '@/wallet/lib/hive';
import { convertStringToBig } from '@ui/lib/helpers';
import { useQuery } from '@tanstack/react-query';
interface useTradeHistoryOptions {
  refetchInterval: number;
}

export const useTradeHistory = (config?: useTradeHistoryOptions) => {
  return useQuery(['recentTrades'], () => getRecentTrades(), {
    ...config,
    select: (data) => {
      return data.map((e) => ({
        ...e,
        hbd: convertStringToBig(e.current_pays.nai === '@@000000013' ? e.current_pays : e.open_pays),
        hive: convertStringToBig(e.current_pays.nai === '@@000000021' ? e.current_pays : e.open_pays)
      }));
    }
  });
};
