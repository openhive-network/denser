'use client';

import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IUnreadNotifications } from '@hive/common-hiveio-packages/wax';
import { getNotificationsUnread } from '@transaction/lib/lite-notifications-api';
import { getLogger } from '@ui/lib/logging';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { unreadNotificationsKey } from '@/blog/features/activity-log/hooks/use-unread-notifications';
import { liteGatewayEndpoint } from './lite-endpoints';
import { showsLiteReadMarker } from './lite-read-marker';
import { liteRelayInfoQuery } from './lite-relay-info-query';
import { liteActorDid, liteSocialFailure } from './lite-social-state';
import { useLiteSocialAccess, useLiteSocialFailureToast } from './use-lite-social-mutation';

const logger = getLogger('app');

/** When to look for the relayed marker on the node: it is indexed a block or two after the gateway's 202. */
const VALIDATION_DELAYS_MS = [4000, 10000, 20000];

/**
 * "Mark all as read" for the browser's lite identity: signs `set_last_read { date }` with its
 * posting key (the signing code is loaded on the first use) and POSTs it to the gateway's `/l2`.
 * The unread count drops to 0 at once; a validated refetch replaces it once the node shows the
 * marker, a failure restores it and toasts. `available` is false where the gateway does not relay
 * `set_last_read` for the node's social app.
 */
export function useLiteMarkNotificationsReadMutation() {
  const queryClient = useQueryClient();
  const { identity, app, available } = useLiteSocialAccess('set_last_read');
  const relay = useQuery(liteRelayInfoQuery);
  const onFailure = useLiteSocialFailureToast();
  const cleanupRef = useRef<(() => void) | null>(null);
  const did = identity ? liteActorDid(identity.name) : null;

  const mutation = useMutation({
    onMutate: async (date: string) => {
      if (!did) return { previous: undefined };
      const queryKey = unreadNotificationsKey(did);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<IUnreadNotifications | null>(queryKey);
      queryClient.setQueryData<IUnreadNotifications>(queryKey, { lastread: date, unread: 0 });
      return { previous };
    },
    mutationFn: async (date: string) => {
      const info = relay.data?.enabled ? relay.data : undefined;
      if (!identity || !app || !info) throw new Error('lite set_last_read not available');
      const { buildLiteSocialTransaction, relayLiteSocial } = await import('./lite-social');
      const tx = buildLiteSocialTransaction({ identity, app, chainId: info.chain_id, action: { method: 'set_last_read', date } });
      const result = await relayLiteSocial(liteGatewayEndpoint('/l2'), tx);
      logger.info('Lite set_last_read relayed: %o', result);
      return result;
    },
    onSuccess: (_result, date) => {
      if (!did) return;
      cleanupRef.current?.();
      cleanupRef.current = scheduleValidatedRefetch<IUnreadNotifications | null>(
        queryClient,
        unreadNotificationsKey(did),
        () => getNotificationsUnread(did),
        (fresh) => !!fresh && showsLiteReadMarker(fresh, date),
        VALIDATION_DELAYS_MS,
        { extendedDelays: [] }
      );
    },
    onError: (error: unknown, _date, context) => {
      if (did && context?.previous !== undefined) queryClient.setQueryData(unreadNotificationsKey(did), context.previous);
      else if (did) void queryClient.resetQueries({ queryKey: unreadNotificationsKey(did), exact: true });
      onFailure(error, liteSocialFailure(error)?.retryAfterS);
    }
  });

  return { ...mutation, available };
}
