'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { cancelLiteQueued, getLiteQueueEntry, waitForLiteQueue, type LiteRelayOk } from '@hiveio/lite-account';
import { Button } from '@ui/components/button';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';
import {
  formatWait,
  initialQueueView,
  queueViewReducer,
  relayErrorCode,
  rootPostErrorKey,
  secondsUntil,
  type LiteQueueView,
  type PersistedLiteQueue
} from './lite-root-post';
import { useLiteIdentity } from './use-lite-identity';
import { liteGatewayEndpoint } from './lite-endpoints';
import { useLiteRootPostBuilder } from './use-lite-root-post-mutation';

const logger = getLogger('app');

const TICK_MS = 1_000;
// Position updates only; waitForLiteQueue does the polling that posts the entry.
const POSITION_POLL_MS = 20_000;

type Props = {
  pending: PersistedLiteQueue;
  onPosted: (result: LiteRelayOk) => void;
  onCancelled: () => void;
  /** Leave the panel (the draft is still in the editor); `retry` submits the same draft again. */
  onClose: (retry: boolean) => void;
};

function endedKey(view: LiteQueueView): string {
  if (view.status === 'expired') return rootPostErrorKey('queue_expired', view.reason);
  return rootPostErrorKey(view.status === 'failed' ? view.code : undefined);
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/**
 * A queued guest root post (the gateway's 202): its position and the countdown to `due_at`, a
 * Cancel that refunds the quota, and the wait itself — waitForLiteQueue, re-signing the same
 * content for whichever gate account the gateway reserves. An expiry or failure is explained and
 * offers a retry; the draft is never touched here.
 */
export function LiteQueueStatus({ pending, onPosted, onCancelled, onClose }: Props) {
  const { t } = useTranslation('common_blog');
  const { identity } = useLiteIdentity();
  const build = useLiteRootPostBuilder();
  const [view, dispatch] = useReducer(queueViewReducer, pending.queued, initialQueueView);
  const [cancelling, setCancelling] = useState(false);
  const waiting = view.status === 'queued' || view.status === 'ready';
  const now = useNow(view.status === 'queued');
  const queueId = pending.queued.queue_id;

  const latest = useRef({ identity, build, onPosted, comment: pending.comment });
  latest.current = { identity, build, onPosted, comment: pending.comment };

  const entry = useQuery({
    queryKey: ['liteQueueEntry', queueId],
    queryFn: () => getLiteQueueEntry(liteGatewayEndpoint(), queueId),
    refetchInterval: POSITION_POLL_MS,
    enabled: waiting,
    retry: false
  });
  useEffect(() => {
    if (entry.data) dispatch({ type: 'entry', entry: entry.data });
  }, [entry.data]);

  useEffect(() => {
    const controller = new AbortController();
    const resign = (gateAccount: string) => {
      const { identity: who, build: sign, comment } = latest.current;
      const request = who ? sign(who, comment, gateAccount) : null;
      if (!request) throw new Error('no lite identity or gateway info to re-sign the queued post with');
      return request;
    };
    waitForLiteQueue(liteGatewayEndpoint(), pending.queued, { resign, signal: controller.signal }).then(
      (result) => {
        dispatch({ type: 'posted', result });
        latest.current.onPosted(result);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        logger.error(error, 'Queued lite root post ended without a post');
        const failure = relayErrorCode(error);
        dispatch({ type: 'failed', code: failure?.code ?? 'unknown', reason: failure?.reason });
      }
    );
    return () => controller.abort();
    // The wait belongs to the ticket; the callbacks it uses are read through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId]);

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelLiteQueued(liteGatewayEndpoint(), queueId);
      dispatch({ type: 'cancelled' });
      onCancelled();
    } catch (error) {
      logger.error(error, 'Cancelling the queued lite root post failed');
      const failure = relayErrorCode(error);
      toast({ title: t('lite_account.root_post.queue.cancel_failed'), description: t(`lite_account.root_post.errors.${rootPostErrorKey(failure?.code)}`), variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background-secondary/30 p-4 text-sm" data-testid="lite-queue-status" data-status={view.status}>
      <span className="font-medium">{pending.comment.title}</span>
      {view.status === 'queued' ? (
        <>
          <p>{t('lite_account.root_post.queue.queued')}</p>
          {view.position !== undefined ? (
            <p data-testid="lite-queue-position">{t('lite_account.root_post.queue.position', { position: view.position })}</p>
          ) : null}
          <p className="tabular-nums" data-testid="lite-queue-countdown">
            {secondsUntil(view.dueAt, now) > 0
              ? t('lite_account.root_post.queue.due_in', { wait: formatWait(secondsUntil(view.dueAt, now)) })
              : t('lite_account.root_post.queue.due_now')}
          </p>
        </>
      ) : null}
      {view.status === 'ready' || view.status === 'done' ? (
        <p className="flex items-center gap-2">
          <CircleSpinner loading size={14} color="#dc2626" />
          {t('lite_account.root_post.queue.ready')}
        </p>
      ) : null}
      {view.status === 'expired' || view.status === 'failed' ? (
        <>
          <p className="font-medium">{t('lite_account.root_post.queue.ended_title')}</p>
          <p data-testid="lite-queue-ended">
            {t(`lite_account.root_post.errors.${endedKey(view)}`)}{' '}
            {t('lite_account.gateway.draft_kept')}
          </p>
        </>
      ) : null}
      <div className="flex items-center gap-3">
        {waiting ? (
          <Button size="sm" variant="outline" disabled={cancelling || view.status === 'ready'} onClick={cancel} data-testid="lite-queue-cancel">
            {t('lite_account.root_post.queue.cancel')}
          </Button>
        ) : null}
        {view.status === 'expired' || view.status === 'failed' ? (
          <>
            <Button size="sm" onClick={() => onClose(true)} data-testid="lite-queue-retry">
              {t('lite_account.root_post.queue.retry')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onClose(false)} data-testid="lite-queue-back">
              {t('lite_account.root_post.queue.back_to_editor')}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
