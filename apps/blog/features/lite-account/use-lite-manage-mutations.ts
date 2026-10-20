'use client';

import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  buildLiteDeleteRequest,
  buildLiteEditRequest,
  postLiteDelete,
  postLiteEdit,
  type LiteAppIds,
  type LiteDeleteMode,
  type LiteIdentity
} from '@hiveio/lite-account';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { useTranslation } from '@/blog/i18n/client';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { discussionKey, fetchDiscussion, type DiscussionParams } from '../post-rendering/lib/discussion-cache';
import { relayErrorCode } from './lite-root-post';
import { liteL1Author, liteL1Parent, liteManageErrorKey, type LiteL1Parent } from './lite-ownership';
import {
  asLiteTombstone,
  showsLiteDeletion,
  showsLiteEdit,
  updateEntry,
  withLiteDeletion,
  withLiteEdit,
  type Discussion
} from './lite-manage-cache';
import { useLiteIdentity } from './use-lite-identity';
import { LITE_GATEWAY_ENDPOINT, useLiteRelayInfo } from './use-lite-relay-info';

const logger = getLogger('app');

export type LiteManageTarget = DiscussionParams & { entry: Entry };
export type LiteEditVariables = LiteManageTarget & { title: string; body: string; tags: string[] };

/** Where an entry lives on L1 and who signs for it; null when this browser cannot change it. */
type SigningContext = {
  identity: LiteIdentity;
  chainId: string;
  apps: LiteAppIds;
  clientId: string;
  l1Author: string;
  parent: LiteL1Parent;
};

const sameEntry = (entry: Entry) => (e: Entry | undefined) => e?.author === entry.author && e?.permlink === entry.permlink;

const postDataFilter = (entry: Entry) => ({
  predicate: (q: { queryKey: readonly unknown[] }) => q.queryKey[0] === 'postData' && q.queryKey[2] === entry.permlink
});

function updatePostData(queryClient: QueryClient, entry: Entry, update: (e: Entry) => Entry) {
  const matches = sameEntry(entry);
  queryClient.setQueriesData<Entry>(postDataFilter(entry), (e: Entry | undefined) => (e && matches(e) ? update(e) : e));
}

function useSigningContext() {
  const queryClient = useQueryClient();
  const relay = useLiteRelayInfo();
  const { identity, ensureClientId } = useLiteIdentity();

  return useCallback(
    ({ entry, ...params }: LiteManageTarget): SigningContext => {
      const info = relay.data?.enabled ? relay.data : undefined;
      const discussion = queryClient.getQueryData<Discussion>(discussionKey(params)) ?? {};
      const find = (author: string, permlink: string) =>
        Object.values(discussion).find((e) => e.author === author && e.permlink === permlink);
      const l1Author = liteL1Author(entry);
      const parent = liteL1Parent(entry, find);
      if (!info || !identity || !l1Author || !parent) throw new Error('lite post location or identity unknown');
      return { identity, chainId: info.chain_id, apps: info.apps, clientId: ensureClientId(), l1Author, parent };
    },
    [queryClient, relay.data, identity, ensureClientId]
  );
}

function useFailureToast(titleKey: string) {
  const { t } = useTranslation('common_blog');
  return (error: unknown) => {
    logger.error(error, 'Lite post change failed');
    const description = t(`lite_account.manage.errors.${liteManageErrorKey(relayErrorCode(error)?.code)}`);
    toast({ title: t(titleKey), description, variant: 'destructive' });
  };
}

/**
 * Edits the lite owner's post or comment through the gateway's /edit (same permlink, new
 * content and attestation): the cached discussion and post show the edit at once, a validated
 * refetch replaces them once the node indexed it, and a failure restores them and toasts.
 */
export function useLiteEditMutation() {
  const { t } = useTranslation('common_blog');
  const queryClient = useQueryClient();
  const signing = useSigningContext();
  const cleanupRef = useRef<(() => void) | null>(null);
  const onFailure = useFailureToast('lite_account.manage.edit_failed_title');

  return useMutation({
    onMutate: async (v: LiteEditVariables) => {
      const queryKey = discussionKey(v);
      cleanupRef.current?.();
      cleanupRef.current = null;
      await queryClient.cancelQueries({ queryKey });
      const prevData = queryClient.getQueryData<Discussion>(queryKey);
      const prevPosts = queryClient.getQueriesData<Entry>(postDataFilter(v.entry));
      const content = { title: v.title, body: v.body, tags: v.tags };
      const nowIso = new Date().toISOString();
      if (prevData) queryClient.setQueryData(queryKey, updateEntry(prevData, v.entry, (e) => withLiteEdit(e, content, nowIso)));
      updatePostData(queryClient, v.entry, (e) => withLiteEdit(e, content, nowIso));
      return { queryKey, prevData, prevPosts };
    },
    mutationFn: async (v: LiteEditVariables) => {
      const ctx = signing(v);
      const { request } = buildLiteEditRequest({
        identity: ctx.identity,
        l1Author: ctx.l1Author,
        permlink: v.entry.permlink,
        chainId: ctx.chainId,
        apps: ctx.apps,
        clientId: ctx.clientId,
        content: { parent_author: ctx.parent.author, parent_permlink: ctx.parent.permlink, title: v.title, body: v.body, tags: v.tags }
      });
      const result = await postLiteEdit(`${LITE_GATEWAY_ENDPOINT}/edit`, request);
      logger.info('Lite edit relayed: %o', result);
      return result;
    },
    onSuccess: (_result, v) => {
      toast({ title: t('lite_account.manage.edited_title'), description: t('lite_account.manage.edited_description'), variant: 'success' });
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        discussionKey(v),
        () => fetchDiscussion(v),
        (fresh: Discussion | null) => showsLiteEdit(fresh, v.entry, v.body),
        undefined,
        { onValidated: () => void queryClient.invalidateQueries(postDataFilter(v.entry)) }
      );
    },
    onError: (error: unknown, _v, context) => {
      if (context?.prevData) queryClient.setQueryData(context.queryKey, context.prevData);
      for (const [key, data] of context?.prevPosts ?? []) queryClient.setQueryData(key, data);
      onFailure(error);
    }
  });
}

/**
 * Deletes the lite owner's post or comment through the gateway's /delete. Resolves with how it
 * went: `l1_delete` takes the entry out of the cached discussion, `tombstone` (L1 refused, the
 * gateway blank-edited it) leaves it with the tombstone content; a validated refetch follows.
 */
export function useLiteDeleteMutation() {
  const { t } = useTranslation('common_blog');
  const queryClient = useQueryClient();
  const signing = useSigningContext();
  const cleanupRef = useRef<(() => void) | null>(null);
  const onFailure = useFailureToast('lite_account.manage.delete_failed_title');

  return useMutation({
    mutationFn: async (v: LiteManageTarget) => {
      const ctx = signing(v);
      const { request } = buildLiteDeleteRequest({
        identity: ctx.identity,
        l1Author: ctx.l1Author,
        permlink: v.entry.permlink,
        chainId: ctx.chainId,
        apps: ctx.apps,
        clientId: ctx.clientId,
        parentAuthor: ctx.parent.author,
        parentPermlink: ctx.parent.permlink
      });
      const result = await postLiteDelete(`${LITE_GATEWAY_ENDPOINT}/delete`, request);
      logger.info('Lite delete relayed: %o', result);
      return { mode: result.mode, apps: ctx.apps, attester: ctx.identity.name };
    },
    onSuccess: async ({ mode, apps, attester }: { mode: LiteDeleteMode; apps: LiteAppIds; attester: string }, v) => {
      const queryKey = discussionKey(v);
      cleanupRef.current?.();
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Discussion>(queryKey, (prev: Discussion | undefined) => prev && withLiteDeletion(prev, v.entry, mode, { apps, attester }));
      if (mode === 'tombstone') updatePostData(queryClient, v.entry, (e) => asLiteTombstone(e, apps, attester));
      toast({ title: t('lite_account.manage.deleted_title'), description: t(`lite_account.manage.deleted_${mode}`), variant: 'success' });
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        queryKey,
        () => fetchDiscussion(v),
        (fresh: Discussion | null) => showsLiteDeletion(fresh, v.entry, mode, apps),
        [4000, 10000, 20000]
      );
    },
    onError: onFailure
  });
}
