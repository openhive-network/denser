'use client';

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_LITE_APP_IDS, type LiteAppIds } from '@hive/lite-account';

export const LITE_RELAY_ENDPOINT = '/api/lite-reply';

export type LiteRelayInfo =
  | { enabled: false }
  | { enabled: true; gate_account: string; chain_id: string; apps: LiteAppIds };

function isAppIds(value: unknown): value is LiteAppIds {
  return typeof value === 'object' && value !== null && 'account' in value && 'posts' in value
    && typeof value.account === 'string' && typeof value.posts === 'string';
}

function isRelayInfo(value: unknown): value is LiteRelayInfo {
  if (typeof value !== 'object' || value === null || !('enabled' in value)) return false;
  if (value.enabled !== true) return true;
  return 'gate_account' in value && 'chain_id' in value && 'apps' in value && isAppIds(value.apps);
}

/** The on-chain namespace to read attributions with: the relay's when it runs, else the release ids. */
export function relayAppIds(info: LiteRelayInfo | undefined): LiteAppIds {
  return info?.enabled ? info.apps : DEFAULT_LITE_APP_IDS;
}

async function fetchLiteRelayInfo(): Promise<LiteRelayInfo> {
  const response = await fetch(LITE_RELAY_ENDPOINT, { method: 'GET' });
  if (!response.ok) return { enabled: false };
  const payload: unknown = await response.json().catch(() => null);
  return isRelayInfo(payload) ? payload : { enabled: false };
}

/** Whether this deployment runs a lite-account relay, and which gate/chain it serves. */
export function useLiteRelayInfo() {
  return useQuery({ queryKey: ['liteRelayInfo'], queryFn: fetchLiteRelayInfo, staleTime: 5 * 60_000, retry: false });
}
