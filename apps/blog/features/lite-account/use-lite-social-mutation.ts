'use client';

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AccountFollowStats, FullAccount } from '@hive/common-hiveio-packages/wax';
import { liteSocialApp } from '@transaction/lib/lite-api';
import { getLiteFollowing, getLiteSubscriptions } from '@transaction/lib/lite-social-api';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { liteGatewayEndpoint } from './lite-endpoints';
import {
  applyLiteSocialAction,
  EMPTY_LITE_RELATIONS,
  followCountDelta,
  followCountKey,
  liteRelationsKey,
  shiftFollowCount,
  showsLiteSocialAction,
  type LiteRelations
} from './lite-social-cache';
import {
  liteActorDid,
  liteSocialErrorKey,
  liteSocialFailure,
  relaysLiteSocial,
  type LiteSocialAction,
  type LiteSocialMethod
} from './lite-social-state';
import { useLiteApiInfo } from './use-lite-api-info';
import { liteRelayInfoQuery } from './lite-relay-info-query';
import { useRetryCountdown } from './use-retry-countdown';
import { useStoredLiteIdentity } from './use-stored-lite-identity';

// No runtime import of @hiveio/lite-account here (`useLiteRelayInfo` has one): these hooks serve
// buttons on every feed and profile page; the signing code is imported on the first op.

const logger = getLogger('app');

/** How many follows / mutes of the lite account are read to know its state; the gateway's quota is far below. */
const RELATIONS_LIMIT = 1000;
/** How long to wait when the gateway says `rate_limited` without a `retry_after_s`. */
const DEFAULT_RETRY_S = 60;
/** When to look for the relayed op on the node: it is indexed a block or two after the gateway's 202. */
const VALIDATION_DELAYS_MS = [4000, 10000, 20000];

async function fetchLiteRelations(did: string): Promise<LiteRelations> {
  const [following, muted, subscriptions] = await Promise.all([
    getLiteFollowing({ account: did, start: null, type: 'blog', limit: RELATIONS_LIMIT }),
    getLiteFollowing({ account: did, start: null, type: 'ignore', limit: RELATIONS_LIMIT }),
    getLiteSubscriptions(did)
  ]);
  return {
    following: (following ?? []).map((row) => row.following),
    muted: (muted ?? []).map((row) => row.following),
    subscriptions: (subscriptions ?? []).map((row) => row[0])
  };
}

/**
 * The browser's lite identity (read from storage, without the signing code) and whether it can
 * send `method` now: the API node advertises the social app, the deployment's gateway relays the
 * method for it, and the identity is registered (its first reply or post registered it; the
 * gateway refuses ops of an account it has no posting key on record for).
 */
export function useLiteSocialAccess(method: LiteSocialMethod) {
  const identity = useStoredLiteIdentity();
  const app = liteSocialApp(useLiteApiInfo());
  const relay = useQuery(liteRelayInfoQuery);
  const available = !!identity?.registered && relaysLiteSocial(relay.data, app, method);
  return { identity: available ? identity : null, app: available ? app : null, available };
}

/** What the lite account `did` follows, mutes and subscribes to; empty until known or without `did`. */
export function useLiteRelations(did: string | null) {
  const query = useQuery({
    queryKey: liteRelationsKey(did ?? ''),
    queryFn: () => fetchLiteRelations(did ?? ''),
    enabled: !!did
  });
  return { relations: query.data ?? EMPTY_LITE_RELATIONS, isPending: !!did && query.isPending };
}

type Snapshot = { key: readonly unknown[]; data: unknown };

function shiftCounts(queryClient: QueryClient, account: string, field: 'follower_count' | 'following_count', delta: number) {
  queryClient.setQueryData<AccountFollowStats>(followCountKey(account), (stats: AccountFollowStats | undefined) => stats && shiftFollowCount(stats, field, delta));
  queryClient.setQueryData<FullAccount>(['profileData', account], (profile: FullAccount | undefined) =>
    profile?.follow_stats ? { ...profile, follow_stats: shiftFollowCount(profile.follow_stats, field, delta) } : profile
  );
}

function snapshot(queryClient: QueryClient, keys: (readonly unknown[])[]): Snapshot[] {
  return keys.map((key) => ({ key, data: queryClient.getQueryData(key) }));
}

/** Logs a failed lite social op and toasts the gateway's reason (`retryAfterS` for `rate_limited`). */
export function useLiteSocialFailureToast() {
  const { t } = useTranslation('common_blog');
  return (error: unknown, retryAfterS: number | undefined) => {
    logger.error(error, 'Lite social op failed');
    const key = liteSocialErrorKey(liteSocialFailure(error)?.code);
    const description = t(`lite_account.social.errors.${key}`, { seconds: retryAfterS ?? DEFAULT_RETRY_S });
    toast({ title: t('lite_account.social.failed_title'), description, variant: 'destructive' });
  };
}

/**
 * Sends one lite social op as the browser's lite identity: signs it (the signing code is loaded on
 * the first use) and POSTs it to the gateway's `/l2`. Follows, mutes and subscriptions and the
 * follow counts change in the cache at once; a validated refetch replaces them once the node has
 * indexed the op, a failure restores them and toasts. `rate_limited` starts `retrySecondsLeft`.
 */
export function useLiteSocialMutation(method: LiteSocialMethod) {
  const queryClient = useQueryClient();
  const { identity, app } = useLiteSocialAccess(method);
  const relay = useQuery(liteRelayInfoQuery);
  const countdown = useRetryCountdown();
  const cleanupRef = useRef<(() => void) | null>(null);
  const onFailure = useLiteSocialFailureToast();
  const actor = identity ? liteActorDid(identity.name) : null;

  const mutation = useMutation({
    onMutate: async (action: LiteSocialAction) => {
      if (!actor) return { snapshots: [] };
      const target = 'target' in action ? action.target : undefined;
      const keys = [liteRelationsKey(actor), followCountKey(actor), ['profileData', actor]];
      if (target) keys.push(followCountKey(target), ['profileData', target]);
      await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const snapshots = snapshot(queryClient, keys);
      queryClient.setQueryData<LiteRelations>(liteRelationsKey(actor), (prev: LiteRelations | undefined) => applyLiteSocialAction(prev ?? EMPTY_LITE_RELATIONS, action));
      const delta = followCountDelta(action);
      if (target && delta !== 0) {
        shiftCounts(queryClient, target, 'follower_count', delta);
        shiftCounts(queryClient, actor, 'following_count', delta);
      }
      return { snapshots };
    },
    mutationFn: async (action: LiteSocialAction) => {
      const info = relay.data?.enabled ? relay.data : undefined;
      if (!identity || !app || !info) throw new Error('lite social op not available');
      const { buildLiteSocialTransaction, relayLiteSocial } = await import('./lite-social');
      const tx = buildLiteSocialTransaction({ identity, app, chainId: info.chain_id, action });
      const result = await relayLiteSocial(liteGatewayEndpoint('/l2'), tx);
      logger.info('Lite social op relayed: %o', result);
      return result;
    },
    onSuccess: (_result, action) => {
      if (!actor) return;
      cleanupRef.current?.();
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        liteRelationsKey(actor),
        () => fetchLiteRelations(actor),
        (fresh: LiteRelations) => showsLiteSocialAction(fresh, action),
        VALIDATION_DELAYS_MS,
        {
          onValidated: () => {
            void queryClient.invalidateQueries({ queryKey: followCountKey(actor) });
            if ('target' in action) void queryClient.invalidateQueries({ queryKey: followCountKey(action.target) });
          },
          extendedDelays: []
        }
      );
    },
    onError: (error: unknown, _action, context) => {
      // A cache entry that had no data has none to restore: it is reset, and read again if shown.
      for (const { key, data } of context?.snapshots ?? []) {
        if (data === undefined) void queryClient.resetQueries({ queryKey: key, exact: true });
        else queryClient.setQueryData(key, data);
      }
      const failure = liteSocialFailure(error);
      if (failure?.code === 'rate_limited') countdown.start(failure.retryAfterS ?? DEFAULT_RETRY_S);
      onFailure(error, failure?.retryAfterS);
    }
  });

  return { ...mutation, retrySecondsLeft: countdown.secondsLeft };
}
