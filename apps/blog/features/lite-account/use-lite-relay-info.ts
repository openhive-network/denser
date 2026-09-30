'use client';

import { useQuery } from '@tanstack/react-query';

export const LITE_RELAY_ENDPOINT = '/api/lite-reply';

export type LiteRelayInfo = { enabled: false } | { enabled: true; gate_account: string; chain_id: string };

function isRelayInfo(value: unknown): value is LiteRelayInfo {
  if (typeof value !== 'object' || value === null || !('enabled' in value)) return false;
  if (value.enabled !== true) return true;
  return 'gate_account' in value && 'chain_id' in value;
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
