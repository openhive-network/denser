import { getFinancialReportOperations } from '@/wallet/lib/hive';
import { useQuery } from '@tanstack/react-query';

export const useFinancialReportOperations = (username: string) => {
  return useQuery(
    ['financialReportOperations', username],
    () => getFinancialReportOperations(username),
    {
      enabled: Boolean(username)
    }
  );
};
