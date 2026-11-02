import { useQuery } from '@tanstack/react-query';
import { getDynamicGlobalProperties, getWitnessSchedule } from '@transaction/lib/hive-api';
import { minRcDelegationRaw } from '@/wallet/lib/min-delegation';

/**
 * Raw RC of the smallest non-zero RC delegation the chain accepts; undefined while it loads, when
 * it could not be loaded or when `enabled` is false.
 */
export function useMinRcDelegation(enabled: boolean): string | undefined {
  // The same keys as the transfers page and the HP delegation minimum, so both are usually cached.
  const { data: schedule } = useQuery({
    queryKey: ['witnessSchedule'],
    queryFn: getWitnessSchedule,
    enabled
  });
  const { data: globals } = useQuery({
    queryKey: ['dynamicGlobalPropertiesData'],
    queryFn: () => getDynamicGlobalProperties(),
    enabled
  });
  // A disabled query still returns what another component cached.
  if (!enabled || !schedule || !globals) return undefined;
  const minimum = minRcDelegationRaw(
    schedule.median_props.account_creation_fee,
    globals.total_vesting_shares,
    globals.total_vesting_fund_hive
  );
  return minimum === null ? undefined : minimum.toString();
}
