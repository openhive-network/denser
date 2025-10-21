import { useQuery } from '@tanstack/react-query';
import { getDynamicGlobalProperties } from '@transaction/lib/hive-api';

export const useDynamicGlobalData = () =>
  useQuery({
    queryKey: ['dynamicGlobalData'],
    queryFn: () => getDynamicGlobalProperties()
  });
