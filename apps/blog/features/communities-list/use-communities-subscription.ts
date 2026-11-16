'use client';

import { useCallback, useState } from 'react';
import type { Community } from '@hive/common-hiveio-packages/wax';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { handleError } from '@ui/lib/handle-error';
import {
  useSubscribeMutation,
  useUnsubscribeMutation
} from '@/blog/features/community-profile/hooks/use-subscribe-mutations';
import { liteActorDid } from '@/blog/features/lite-account/lite-social-state';
import {
  useLiteRelations,
  useLiteSocialAccess,
  useLiteSocialMutation
} from '@/blog/features/lite-account/use-lite-social-mutation';

/** What a community card shows on its subscribe button; plain values, the same shape for every card. */
export interface CommunitySubscriptionState {
  subscribed: boolean;
  busy: boolean;
  disabled: boolean;
  retrySecondsLeft: number | null;
}

/**
 * Subscribe / Leave for every card of a communities list, for one reader: as the Hive account when
 * signed in, as the browser's lite account through the gateway when it can (see
 * `useLiteSocialAccess`), otherwise through the sign-in dialog the list owns (`needsLogin`). The
 * reader's state and the mutations are mounted here once, not per card.
 */
export function useCommunitiesSubscription(userSubscriptions: string[][] | null | undefined) {
  const { user } = useUserClient();
  const isHiveUser = !!user?.isLoggedIn;
  const { identity } = useLiteSocialAccess('subscribe');
  const actor = !isHiveUser && identity ? liteActorDid(identity.name) : null;
  const { relations, isPending: relationsPending } = useLiteRelations(actor);
  const subscribeMutation = useSubscribeMutation();
  const unsubscribeMutation = useUnsubscribeMutation();
  const liteMutation = useLiteSocialMutation('subscribe');
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const needsLogin = !isHiveUser && !actor;

  const track = useCallback(async (community: string, run: () => Promise<unknown>) => {
    setPending((prev) => new Set(prev).add(community));
    try {
      await run();
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(community);
        return next;
      });
    }
  }, []);

  const stateOf = (community: Community): CommunitySubscriptionState => {
    const busy = pending.has(community.name);
    if (actor) {
      return {
        subscribed: relations.subscriptions.includes(community.name),
        busy: busy || relationsPending,
        disabled: false,
        retrySecondsLeft: liteMutation.retrySecondsLeft
      };
    }
    const subscribed =
      isHiveUser &&
      (Boolean(community.context.subscribed) || !!userSubscriptions?.some((sub) => sub[0] === community.name));
    return { subscribed, busy, disabled: isHiveUser && !!community.context._temporary, retrySecondsLeft: null };
  };

  const toggleHive = (community: Community, subscribed: boolean) => {
    const params = { community: community.name, username: user.username, communityTitle: community.title };
    const mutation = subscribed ? unsubscribeMutation : subscribeMutation;
    return track(community.name, async () => {
      try {
        await mutation.mutateAsync(params);
      } catch (error) {
        handleError(error, { method: subscribed ? 'unsubscribe' : 'subscribe', params });
      }
    });
  };

  const toggleLite = (community: Community, subscribed: boolean) =>
    track(community.name, async () => {
      try {
        await liteMutation.mutateAsync({ method: subscribed ? 'unsubscribe' : 'subscribe', community: community.name });
      } catch {
        // useLiteSocialMutation's onError already restored the cache and toasted the failure.
      }
    });

  /** Sends the subscribe or unsubscribe the card's `state` calls for; not for `needsLogin`. */
  const toggle = (community: Community, state: CommunitySubscriptionState) =>
    actor ? toggleLite(community, state.subscribed) : toggleHive(community, state.subscribed);

  return { needsLogin, stateOf, toggle };
}
