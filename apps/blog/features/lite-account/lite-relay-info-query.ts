import type { LiteAppIds } from '@hiveio/lite-account';
import { liteRelayEndpoint } from './lite-endpoints.ts';

// No runtime import of @hiveio/lite-account here: the site header asks this query, and the
// package's signing code must stay out of every page's bundle.

/** The gateway's `/info.limits`; only the fields the UI reads are typed, none is guaranteed. */
export type LiteRelayLimits = {
  root_posts_per_day?: number;
  max_expiration_minutes?: number;
  root_queue?: { depth?: number; max_wait_s?: number; sign_window_s?: number };
  /** What `POST /l2` relays: the methods per L2 app id, the rate limit and the size limits. */
  l2?: {
    apps?: Record<string, string[]>;
    rate?: { max?: number; window_s?: number };
    max_tx_bytes?: number;
    max_operations?: number;
  };
};

/** The gateway's `/info.features`: which changes to a relayed post it takes. Absent means none. */
export type LiteRelayFeatures = { edits?: boolean; deletes?: boolean; tombstone_deletes?: boolean };

export type LiteRelayInfo =
  | { enabled: false }
  | {
      enabled: true;
      gate_account: string;
      chain_id: string;
      apps: LiteAppIds;
      limits?: LiteRelayLimits;
      features?: LiteRelayFeatures;
    };

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
  const response = await fetch(liteRelayEndpoint(), { method: 'GET' });
  if (!response.ok) return { enabled: false };
  const payload: unknown = await response.json().catch(() => null);
  return isRelayInfo(payload) ? payload : { enabled: false };
}

export const liteRelayInfoQuery = { queryKey: ['liteRelayInfo'], queryFn: fetchLiteRelayInfo, staleTime: 5 * 60_000, retry: false };
