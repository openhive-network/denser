import type { LiteAppIds } from '@hiveio/lite-account';

// No runtime import of @hiveio/lite-account here: the site header asks this query, and the
// package's signing code must stay out of every page's bundle.

export const LITE_RELAY_ENDPOINT = '/api/lite-reply';
/** Base of the allow-listed gateway pass-through (`/post`, `/queue/<id>`, …). */
export const LITE_GATEWAY_ENDPOINT = '/api/lite-gateway';

/** The gateway's `/info.limits`; only the fields the UI reads are typed, none is guaranteed. */
export type LiteRelayLimits = {
  root_posts_per_day?: number;
  max_expiration_minutes?: number;
  root_queue?: { depth?: number; max_wait_s?: number; sign_window_s?: number };
};

export type LiteRelayInfo =
  | { enabled: false }
  | { enabled: true; gate_account: string; chain_id: string; apps: LiteAppIds; limits?: LiteRelayLimits };

function isAppIds(value: unknown): value is LiteAppIds {
  return typeof value === 'object' && value !== null && 'account' in value && 'posts' in value
    && typeof value.account === 'string' && typeof value.posts === 'string';
}

function isRelayInfo(value: unknown): value is LiteRelayInfo {
  if (typeof value !== 'object' || value === null || !('enabled' in value)) return false;
  if (value.enabled !== true) return true;
  return 'gate_account' in value && 'chain_id' in value && 'apps' in value && isAppIds(value.apps);
}

async function fetchLiteRelayInfo(): Promise<LiteRelayInfo> {
  const response = await fetch(LITE_RELAY_ENDPOINT, { method: 'GET' });
  if (!response.ok) return { enabled: false };
  const payload: unknown = await response.json().catch(() => null);
  return isRelayInfo(payload) ? payload : { enabled: false };
}

export const liteRelayInfoQuery = { queryKey: ['liteRelayInfo'], queryFn: fetchLiteRelayInfo, staleTime: 5 * 60_000, retry: false };
