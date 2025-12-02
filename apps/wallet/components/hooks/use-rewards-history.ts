import { getRestApiAccountRewardsHistory } from '@/wallet/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import parseDate from '@ui/lib/parse-date';

export const useRewardsHistory = (username: string, opType: 'author_reward_operation' | 'curation_reward_operation') => {
  const { data, isLoading } = useQuery(
    ['accountHistory', username, opType],
    () => getRestApiAccountRewardsHistory(username, opType, 1000),
    {
      select: (data) =>
        data
          .map((element) => ({
            operationType:element.op.type,
            timestamp: parseDate(element.timestamp.toString()),
            op: element.op.value
          })).reverse()
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
