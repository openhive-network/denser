'use client';

import type { ReactNode } from 'react';
import { Button } from '@ui/components/button';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { useTranslation } from '@/blog/i18n/client';
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
  const waiting = mutation.retrySecondsLeft !== null;
  const busy = isPending || mutation.isPending;
  const onClick = () => mutation.mutate({ method: subscribed ? 'unsubscribe' : 'subscribe', community });
  const spinner = <CircleSpinner loading size={18} color="#dc2626" />;

  if (waiting) {
    return (
      <Button size="sm" variant="outline" className="w-full" disabled data-testid="lite-social-retry">
        {t('lite_account.gateway.post_wait', { seconds: mutation.retrySecondsLeft })}
      </Button>
    );
  }
  if (!subscribed) {
    return (
      <Button
        size="sm"
        className="w-full bg-blue-600 text-center text-slate-50 hover:bg-blue-700"
        data-testid="community-subscribe-button"
        disabled={busy}
        onClick={onClick}
      >
        {busy ? spinner : t('communities.buttons.subscribe')}
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="group relative w-full border-blue-600 text-center text-blue-600 hover:border-destructive hover:bg-transparent hover:text-destructive"
      data-testid="community-join-leave-button"
      disabled={busy}
      onClick={onClick}
    >
      {busy ? (
        spinner
      ) : (
        <span>
          <span className="group-hover:hidden">{t('communities.buttons.joined')}</span>
          <span className="hidden group-hover:inline">{t('communities.buttons.leave')}</span>
        </span>
      )}
    </Button>
  );
}
