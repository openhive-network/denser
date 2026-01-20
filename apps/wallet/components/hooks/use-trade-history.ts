import { getRecentTrades } from '@/wallet/lib/hive';
import { convertStringToBig, isHbd } from '@ui/lib/helpers';
import { useQuery } from '@tanstack/react-query';

interface UseTradeHistoryOptions {
  refetchInterval: number;
}

export const useTradeHistory = (config?: UseTradeHistoryOptions) => {
  return useQuery(['recentTrades'], () => getRecentTrades(), {
    ...config,
    select: (data) => {
      return data.map((e) => ({
        ...e,
        hbd: convertStringToBig(isHbd(e.current_pays) ? e.current_pays : e.open_pays),
        hive: convertStringToBig(isHbd(e.current_pays) ? e.open_pays : e.current_pays)
      }));
    }
  });
};
