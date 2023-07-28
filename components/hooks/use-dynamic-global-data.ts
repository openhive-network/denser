import { getDynamicGlobalProperties } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';

export const useDynamicGlobalData = () => useQuery(['dynamicGlobalData'], () => getDynamicGlobalProperties());
