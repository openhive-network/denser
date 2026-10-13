import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type Big from 'big.js';
import { getWitnessSchedule } from '@transaction/lib/hive-api';
import { createNaiAsset } from '@ui/lib/asset-constants';
import { convertStringToBig } from '@ui/lib/helpers';
import { minDelegationHiveSatoshis } from '@/wallet/lib/min-delegation';

/**
 * The smallest delegation the chain accepts, in HP; undefined while it loads, when it could not be
 * loaded or when `enabled` is false.
 */
export function useMinDelegation(enabled: boolean): Big | undefined {
  const { data: minHiveSatoshis } = useQuery({
    queryKey: ['witnessSchedule'],
    queryFn: getWitnessSchedule,
    select: (schedule) => minDelegationHiveSatoshis(schedule.median_props.account_creation_fee),
    enabled
  });
  return useMemo(
    () =>
      // A disabled query still returns what another dialog cached.
      !enabled || minHiveSatoshis === undefined
        ? undefined
        : convertStringToBig(createNaiAsset('HIVE', minHiveSatoshis)),
    [enabled, minHiveSatoshis]
  );
}
