import { getAccountRewardsHistory } from '@/wallet/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import parseDate from '@ui/lib/parse-date';

export const useRewardsHistory = (username: string, opType: 'author_reward' | 'curation_reward') => {
  const { data, isLoading } = useQuery(
    ['accountHistory', username, opType],
    () => getAccountRewardsHistory(username, -1, 1000),
    {
      select: (data) =>
        data
          .filter((e) => e[1].op[0] === opType)
          .map((element) => ({
            operationType: element[1].op[0],
            timestamp: parseDate(element[1].timestamp),
            op: element[1].op[1]
          }))
    }
  );
  const { data: dynamicData, isLoading: dynamicLoading } = useQuery(['dynamicGlobalPropertiesData'], () =>
    getDynamicGlobalProperties()
  );
  return {
    data,
    dynamicData,
    isLoading: isLoading || dynamicLoading
  };
};
