import { useQuery } from '@tanstack/react-query';
import { getDirectDelegationTo } from '@/wallet/lib/hive';

/**
 * The raw RC `from` delegates to `to` now, once `enabled`; '0' until it is known. delegate_rc sets
 * the new total for a recipient, and the chain checks only its increase over this.
 */
export const useExistingRcDelegation = (from: string, to: string, enabled: boolean): string => {
  const { data } = useQuery({
    queryKey: ['rcDirectDelegation', from, to],
    queryFn: () => getDirectDelegationTo(from, to),
    enabled: enabled && !!from && !!to
  });
  return enabled && data ? data : '0';
};
