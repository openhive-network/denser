'use client';

import type { ReactNode } from 'react';
import { Button } from '@ui/components/button';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { toast } from '@ui/components/hooks/use-toast';
import { useTranslation } from '@/blog/i18n/client';
import { liteL1Author } from './lite-ownership';
import { liteActorDid } from './lite-social-state';
import { useLiteSocialAccess, useLiteSocialMutation } from './use-lite-social-mutation';

type Props = {
  /** The root post: `author` may be a DID, whose L1 author (the gate) `url` names. */
  post: { author: string; permlink: string; url: string };
  onDone: () => void;
  /** What a guest who cannot act as a lite account gets instead (e.g. the sign-in button). */
  fallback: ReactNode;
};

/**
 * The reblog dialog's confirm button for a reader who is not signed in: reblogs the root post as
 * the browser's lite account through the gateway (`reblog` names the post by its L1 author).
 * `fallback` where it cannot; nothing for the lite account's own posts.
 */
export default function LiteReblogAction({ post, onDone, fallback }: Props) {
  const { t } = useTranslation('common_blog');
  const { identity } = useLiteSocialAccess('reblog');
  const mutation = useLiteSocialMutation('reblog');
  const l1Author = liteL1Author(post);

  if (!identity || !l1Author) return <>{fallback}</>;
  if (post.author === liteActorDid(identity.name)) return null;

  const waiting = mutation.retrySecondsLeft !== null;
  const reblog = () =>
    mutation.mutate(
      { method: 'reblog', author: l1Author, permlink: post.permlink },
      {
        onSuccess: () => {
          toast({ title: t('lite_account.social.reblogged_title'), variant: 'success' });
          onDone();
        }
      }
    );

  return (
    <Button
      autoFocus
      disabled={mutation.isPending || waiting}
      className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-destructive hover:bg-destructive hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
      onClick={reblog}
      data-testid="reblog-dialog-ok"
    >
      {mutation.isPending ? <CircleSpinner loading size={14} color="#ffffff" /> : null}
      {waiting
        ? t('lite_account.gateway.post_wait', { seconds: mutation.retrySecondsLeft })
        : t('alert_dialog_reblog.action')}
    </Button>
  );
}
