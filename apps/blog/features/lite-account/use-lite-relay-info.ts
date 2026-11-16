'use client';

import { useQuery } from '@tanstack/react-query';
import type { LiteAppIds } from '@hiveio/lite-account';
import { DEFAULT_LITE_APP_IDS } from './lite-attribution';
import { liteRelayInfoQuery, type LiteRelayInfo } from './lite-relay-info-query';

export {
  type LiteRelayFeatures,
  type LiteRelayInfo,
  type LiteRelayLimits
} from './lite-relay-info-query';

/** The on-chain namespace to read attributions with: the relay's when it runs, else the release ids. */
export function relayAppIds(info: LiteRelayInfo | undefined): LiteAppIds {
  return info?.enabled ? info.apps : DEFAULT_LITE_APP_IDS;
}

/** Whether this deployment runs a lite-account relay, and which gate/chain it serves. */
export function useLiteRelayInfo() {
  return useQuery(liteRelayInfoQuery);
}

const NO_RELAY: LiteRelayInfo = { enabled: false };

/**
 * `select` of the relay info, read as no relay until it is known (or when it cannot be read). The
 * component re-renders only when the selected value changes, not when the answer arrives: a
 * per-comment caller costs no re-render of the comment on a site without a relay, nor on an
 * entry without lite content. `select` should return a primitive or a plain value (compared deeply).
 */
export function useLiteRelaySelect<T>(select: (info: LiteRelayInfo) => T): T {
  const { data } = useQuery({
    ...liteRelayInfoQuery,
    // A new function each render: a constant placeholder is memoized past `select`, which would
    // keep a stale selection when the caller's inputs change before the answer.
    placeholderData: () => NO_RELAY,
    select
  });
  return data === undefined ? select(NO_RELAY) : data;
}
