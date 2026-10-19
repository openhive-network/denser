'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  buildLiteReplyRequest,
  postLiteRootPost,
  type CommentContent,
  type LiteIdentity,
  type LiteQueued,
  type LiteRelayOk,
  type LiteReplyRequest
} from '@hiveio/lite-account';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';
import { relayErrorCode, rootPostErrorKey, rootPostExpirationMinutes } from './lite-root-post';
import { readiness, readinessText, useLiteGatewayHealth, type LiteReadiness } from './use-lite-gateway-health';
import { useLiteIdentity } from './use-lite-identity';
import { LITE_GATEWAY_ENDPOINT, useLiteRelayInfo } from './use-lite-relay-info';

const logger = getLogger('app');

const SECONDS_PER_MINUTE = 60;

export type LiteRootPostVariables = { identity: LiteIdentity; comment: CommentContent };

export type LiteRootPostOutcome =
  | { kind: 'posted'; result: LiteRelayOk; comment: CommentContent }
  | { kind: 'queued'; queued: LiteQueued; comment: CommentContent };

/** The gateway cannot take a root post now (preflight); nothing was sent. */
export class LiteGatewayNotReadyError extends Error {
  constructor(readonly readiness: LiteReadiness) {
    super(`lite gateway not ready: ${readiness.reason ?? 'down'}`);
    this.name = 'LiteGatewayNotReadyError';
  }
}

/**
 * Signs `comment` as a root post for `gateAccount` with the gateway's app namespace and its
 * longest attestation lifetime; null while the gateway's /info is unknown or disabled.
 */
export function useLiteRootPostBuilder() {
  const relay = useLiteRelayInfo();
  const { ensureClientId } = useLiteIdentity();
  const info = relay.data?.enabled ? relay.data : undefined;

  return useCallback(
    (identity: LiteIdentity, comment: CommentContent, gateAccount?: string): LiteReplyRequest | null => {
      if (!info) return null;
      return buildLiteReplyRequest({
        identity,
        gateAccount: gateAccount ?? info.gate_account,
        chainId: info.chain_id,
        apps: info.apps,
        comment,
        expirationMinutes: rootPostExpirationMinutes(info.limits),
        clientId: ensureClientId()
      }).request;
    },
    [info, ensureClientId]
  );
}

/**
 * Posts a guest root post through the gateway: asks the gateway's health first (a busy root lane
 * that can queue goes ahead, with a toast naming the estimated wait), then POSTs /post. Resolves
 * with the post, or with the queue ticket when the gate slot was taken; every failure toasts and
 * leaves the caller's draft alone.
 */
export function useLiteRootPostMutation() {
  const { t } = useTranslation('common_blog');
  const relay = useLiteRelayInfo();
  const health = useLiteGatewayHealth(!!relay.data?.enabled);
  const { markRegistered } = useLiteIdentity();
  const build = useLiteRootPostBuilder();

  return useMutation({
    mutationFn: async ({ identity, comment }: LiteRootPostVariables): Promise<LiteRootPostOutcome> => {
      const ready = readiness((await health.refetch()).data, 'root');
      if (!ready.ok) throw new LiteGatewayNotReadyError(ready);
      const request = build(identity, comment);
      if (!request) throw new LiteGatewayNotReadyError({ ok: false, reason: 'down' });
      if (ready.queueWaitS) {
        const minutes = Math.ceil(ready.queueWaitS / SECONDS_PER_MINUTE);
        toast({ title: t('lite_account.root_post.will_queue_title'), description: t('lite_account.root_post.will_queue', { minutes }) });
      }
      const answer = await postLiteRootPost(`${LITE_GATEWAY_ENDPOINT}/post`, request);
      logger.info('Lite root post relayed: %o', answer);
      return answer.ok ? { kind: 'posted', result: answer, comment } : { kind: 'queued', queued: answer, comment };
    },
    onSuccess: (outcome, { identity }) => {
      if (outcome.kind === 'posted' && !identity.registered) markRegistered();
    },
    onError: (error: unknown) => {
      logger.error(error, 'Lite root post failed');
      const draftKept = t('lite_account.gateway.draft_kept');
      if (error instanceof LiteGatewayNotReadyError) {
        const description = `${readinessText(t, error.readiness)} ${draftKept}`;
        toast({ title: t('lite_account.root_post.unavailable_title'), description, variant: 'destructive' });
        return;
      }
      const relayError = relayErrorCode(error);
      const reason = t(`lite_account.root_post.errors.${rootPostErrorKey(relayError?.code, relayError?.reason)}`);
      toast({ title: t('lite_account.root_post.failed_title'), description: `${reason} ${draftKept}`, variant: 'destructive' });
    }
  });
}
