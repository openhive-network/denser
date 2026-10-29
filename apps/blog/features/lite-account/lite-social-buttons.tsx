'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@hive/ui';
import FollowButton from '@/blog/features/mute-follow/follow-button';
import MuteButton from '@/blog/features/mute-follow/mute-button';
import { useTranslation } from '@/blog/i18n/client';
import { liteActorDid } from './lite-social-state';
import { useLiteRelations, useLiteSocialAccess, useLiteSocialMutation } from './use-lite-social-mutation';

type Props = {
  /** The account to follow or mute: a Hive account name or a `did:lite:<name>`. */
  target: string;
  variant: ComponentProps<typeof FollowButton>['variant'];
  /** What a guest who cannot act as a lite account gets instead (e.g. the sign-in button). */
  fallback: ReactNode;
};

/**
 * Follow and Mute for a reader who is not signed in, acting as the browser's lite account through
 * the gateway; `fallback` where the node, the gateway or the identity cannot (see
 * `useLiteSocialAccess`). Nothing on the lite account's own profile or posts.
 */
export default function LiteSocialButtons({ target, variant, fallback }: Props) {
  const { t } = useTranslation('common_blog');
  const { identity } = useLiteSocialAccess('follow');
  const actor = identity ? liteActorDid(identity.name) : null;
  const { relations, isPending } = useLiteRelations(actor);
  const mutation = useLiteSocialMutation('follow');

  if (!actor) return <>{fallback}</>;
  if (actor === target) return null;

  const isFollow = relations.following.includes(target);
  const isMute = relations.muted.includes(target);
  const waiting = mutation.retrySecondsLeft !== null;
  const loading = isPending || mutation.isPending;
  const follow = () => mutation.mutate({ method: isFollow ? 'unfollow' : 'follow', target });
  const mute = () => mutation.mutate({ method: isMute ? 'unmute' : 'mute', target });

  return (
    <>
      <FollowButton variant={variant} loading={loading} isFollow={isFollow} onClick={follow} disabled={waiting} />
      <MuteButton variant={variant} loading={loading} isMute={isMute} onClick={mute} disabled={waiting} />
      {waiting ? (
        <Button variant="ghost" size="sm" disabled data-testid="lite-social-retry">
          {t('lite_account.gateway.post_wait', { seconds: mutation.retrySecondsLeft })}
        </Button>
      ) : null}
    </>
  );
}
