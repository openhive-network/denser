'use client';

import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';

export const LITE_GATEWAY_HEALTH_ENDPOINT = '/api/lite-reply/health';
const HEALTH_STALE_MS = 10_000;

type PoolState = {
  ready?: boolean;
  available_in_s?: number;
  queue_len?: number;
  queue_depth?: number;
  can_queue?: boolean;
  queue_wait_s?: number;
};

/** The gateway's /health answer (hive/lite_gateway); only the fields the UI reads are typed. */
export type LiteGatewayHealth = {
  status: 'ok' | 'degraded' | 'down';
  hived?: { ok?: boolean; head_block_age_s?: number; stale?: boolean };
  pools?: Record<string, { reply?: PoolState; root?: PoolState } | undefined>;
};

export type LitePostKind = 'reply' | 'root';

export type LiteReadiness = {
  ok: boolean;
  reason?: 'down' | 'degraded' | 'busy' | 'hived';
  availableInS?: number;
  canQueue?: boolean;
  queueWaitS?: number;
};

const GATEWAY_DOWN: LiteGatewayHealth = { status: 'down' };

function isHealth(value: unknown): value is LiteGatewayHealth {
  if (typeof value !== 'object' || value === null || !('status' in value)) return false;
  return value.status === 'ok' || value.status === 'degraded' || value.status === 'down';
}

const seconds = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

/**
 * Whether the gateway can take a post of `kind` through `pool` now. Not ok when the gateway is
 * down (or unknown), its hived is behind, or the pool has no `kind` lane (`degraded` when the
 * gateway says so, else `down`); a lane that is not ready is `busy`, with `availableInS` when
 * the gateway names it. A root lane that is not ready but `can_queue` is ok, with the queue wait.
 */
export function readiness(health: LiteGatewayHealth | undefined, kind: LitePostKind, pool = 'default'): LiteReadiness {
  if (!health || health.status === 'down') return { ok: false, reason: 'down' };
  if (health.hived && (health.hived.ok === false || health.hived.stale === true)) return { ok: false, reason: 'hived' };
  const lane = health.pools?.[pool]?.[kind];
  if (!lane) return { ok: false, reason: health.status === 'degraded' ? 'degraded' : 'down' };
  const canQueue = kind === 'root' && typeof lane.can_queue === 'boolean' ? lane.can_queue : undefined;
  const queueWaitS = kind === 'root' ? seconds(lane.queue_wait_s) : undefined;
  if (lane.ready === true || canQueue === true) return { ok: true, canQueue, queueWaitS };
  return { ok: false, reason: 'busy', availableInS: seconds(lane.available_in_s), canQueue, queueWaitS };
}

/** The user-facing explanation of a not-ready answer, with "try again in N s" when known. */
export function readinessText(t: TFunction<'common_blog'>, r: LiteReadiness): string {
  const reason = t(`lite_account.gateway.reason_${r.reason ?? 'down'}`);
  if (r.availableInS === undefined) return reason;
  return `${reason} ${t('lite_account.gateway.try_again_in', { seconds: Math.ceil(r.availableInS) })}`;
}

async function fetchLiteGatewayHealth(): Promise<LiteGatewayHealth> {
  try {
    const response = await fetch(LITE_GATEWAY_HEALTH_ENDPOINT, { method: 'GET', cache: 'no-store' });
    if (!response.ok) return GATEWAY_DOWN;
    const payload: unknown = await response.json();
    return isHealth(payload) ? payload : GATEWAY_DOWN;
  } catch {
    return GATEWAY_DOWN;
  }
}

/** The configured gateway's health, asked only while `enabled` (guest posting is offered at all). */
export function useLiteGatewayHealth(enabled: boolean) {
  return useQuery({
    queryKey: ['liteGatewayHealth'],
    queryFn: fetchLiteGatewayHealth,
    staleTime: HEALTH_STALE_MS,
    refetchOnWindowFocus: true,
    retry: false,
    enabled
  });
}
