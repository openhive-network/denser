'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import CommunitySubscribeButton from '@/blog/features/community-profile/community-subscribe-button';
import { liteActorDid } from './lite-social-state';
import { useLiteRelations, useLiteSocialAccess, useLiteSocialMutation } from './use-lite-social-mutation';

/**
 * Subscribe / Leave of a community for a reader who is not signed in, acting as the browser's
 * lite account through the gateway; `fallback` where it cannot (see `useLiteSocialAccess`).
 */
export default function LiteSubscribeButton({ community, fallback }: { community: string; fallback: ReactNode }) {
  const { t } = useTranslation('common_blog');
  const { identity } = useLiteSocialAccess('subscribe');
  const actor = identity ? liteActorDid(identity.name) : null;
  const { relations, isPending } = useLiteRelations(actor);
  const mutation = useLiteSocialMutation('subscribe');

  if (!actor) return <>{fallback}</>;

  const subscribed = relations.subscriptions.includes(community);
  const onClick = () => mutation.mutate({ method: subscribed ? 'unsubscribe' : 'subscribe', community });

  return (
    <CommunitySubscribeButton
      t={t}
      subscribed={subscribed}
      busy={isPending || mutation.isPending}
      retrySecondsLeft={mutation.retrySecondsLeft}
      onClick={onClick}
    />
  );
}
