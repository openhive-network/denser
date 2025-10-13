import { useQuery } from '@tanstack/react-query';
import { getRebloggedBy } from '@transaction/lib/hive-api';

export const useRebloggedByQuery = (author: string = '', permlink: string = '', username: string = '') => {
  return useQuery({
    queryKey: ['PostRebloggedBy', author, permlink, username],
    queryFn: async () => {
      const data = await getRebloggedBy(author, permlink);
      return data.includes(username);
    },

    enabled: !!(username && author && permlink),

    // See https://www.codemzy.com/blog/react-query-cachetime-staletime
    cacheTime: 1000 * 60 * 60 + 5000, // 1 hour 5 seconds
    staleTime: 1000 * 60 * 60 // 1 hour
  });
  // logger.info('Reblog data author: %s, permlink: %s, isReblogged: %o', author, permlink, isReblogged);
};
