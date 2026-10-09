import { getFinancialReportOperations } from '@/wallet/lib/hive';
import { useQuery } from '@tanstack/react-query';

export const useFinancialReportOperations = (username: string) => {
  return useQuery({
    queryKey: ['financialReportOperations', username],
    queryFn: () => getFinancialReportOperations(username),
    enabled: Boolean(username)
  });
};
