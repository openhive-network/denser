import { getOrderBook } from '@/blog/lib/wallet/hive';
import { useQuery } from '@tanstack/react-query';

interface UseOrderBookOptions {
  refetchInterval: number;
}
export const useOrderBook = (config?: UseOrderBookOptions) => {
  return useQuery(['orderBook'], () => getOrderBook(), {
    ...config,
    select: (data) => {
      return {
        ...data,
        asks: data.asks.map((ask) => ({
          ...ask,
          total: ask.hbd / 1000
        })),
        bids: data.bids.map((bid) => ({
          ...bid,
          total: bid.hbd / 1000
        }))
      };
    }
  });
};
