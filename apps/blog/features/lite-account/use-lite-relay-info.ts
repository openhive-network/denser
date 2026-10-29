'use client';

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_LITE_APP_IDS, type LiteAppIds } from '@hiveio/lite-account';
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
