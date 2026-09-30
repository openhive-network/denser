'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postLiteReply, type BuiltLiteReply } from '@hive/lite-account';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { getDiscussion } from '@transaction/lib/bridge-api';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { LITE_RELAY_ENDPOINT } from './use-lite-relay-info';

const logger = getLogger('app');

export type LiteReplyVariables = {
  built: BuiltLiteReply;
  gateAccount: string;
  attester: string;
  body: string;
  parentAuthor: string;
  parentPermlink: string;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
};

type Discussion = Record<string, Entry>;

/** An optimistic bridged comment: author = the gate account, attributed to the lite name via json_metadata. */
function optimisticEntry(v: LiteReplyVariables, parent: Entry | undefined, nowIso: string): Entry {
  const jsonMetadata = { image: '', images: [], author: v.attester };
  Object.assign(jsonMetadata, { lite_bridge: { attester: v.attester, alg: 'lite-comment-v1' } });
  return {
    active_votes: [],
    author: v.gateAccount,
    author_payout_value: '0.000 HBD',
    author_reputation: 25,
    beneficiaries: [],
    blacklists: [],
    body: v.body,
    parent_author: v.parentAuthor,
    parent_permlink: v.parentPermlink,
    category: parent?.category ?? '',
    children: 0,
    created: nowIso,
    curator_payout_value: '0.000 HBD',
    depth: (parent?.depth ?? 0) + 1,
    is_paidout: false,
    json_metadata: jsonMetadata,
    max_accepted_payout: '1000000.000 HBD',
    net_rshares: 0,
    payout: 0,
    payout_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    pending_payout_value: '0.000 HBD',
    percent_hbd: 10000,
    permlink: v.built.permlink,
    post_id: Date.now(),
    promoted: '',
    replies: [],
    stats: { hide: false, gray: false, total_votes: 0, flag_weight: 0 },
    title: `Re: ${parent?.title ?? ''}`,
    updated: nowIso,
    url: `/${parent?.category ?? ''}/@${v.gateAccount}/${v.built.permlink}`,
    _optimistic: true
  };
}

function withOptimistic(prev: Discussion | undefined, v: LiteReplyVariables): Discussion {
  const parent = prev ? Object.values(prev).find((e) => e.author === v.parentAuthor && e.permlink === v.parentPermlink) : undefined;
  const next: Discussion = {};
  for (const [key, post] of Object.entries(prev ?? {})) {
    next[key] = post.author === v.parentAuthor && post.permlink === v.parentPermlink
      ? { ...post, children: (post.children || 0) + 1, replies: [...(post.replies || []), v.built.permlink] }
      : post;
  }
  next[v.built.permlink] = optimisticEntry(v, parent, new Date().toISOString());
  return next;
}

/** Posts a guest reply through the relay with an optimistic cache insert, like useCommentMutation. */
export function useLiteReplyMutation(onFirstPostSucceeded: () => void) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  return useMutation({
    onMutate: async (v: LiteReplyVariables) => {
      const queryKey = ['discussionData', v.discussionAuthor, v.discussionPermlink, v.observer];
      cleanupRef.current?.();
      cleanupRef.current = null;
      await queryClient.cancelQueries({ queryKey });
      const prevData: Discussion | undefined = queryClient.getQueryData(queryKey);
      queryClient.setQueryData<Discussion>(queryKey, withOptimistic(prevData, v));
      return { prevData, queryKey };
    },
    mutationFn: async (v: LiteReplyVariables) => {
      const result = await postLiteReply(LITE_RELAY_ENDPOINT, v.built.request);
      logger.info('Lite reply relayed: %o', result);
      return { ...v, result };
    },
    onSuccess: (data) => {
      if (data.built.request.register_tx) onFirstPostSucceeded();
      const queryKey = ['discussionData', data.discussionAuthor, data.discussionPermlink, data.observer];
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        queryKey,
        () => getDiscussion(data.discussionAuthor, data.discussionPermlink, data.observer),
        (fresh: Discussion | null) =>
          !!fresh && Object.values(fresh).some((e) => e.author === data.gateAccount && e.permlink === data.result.permlink && !e._optimistic)
      );
    },
    onError: (error: unknown, _v, context) => {
      if (context?.prevData) queryClient.setQueryData(context.queryKey, context.prevData);
      else if (context?.queryKey) queryClient.removeQueries({ queryKey: context.queryKey, exact: true });
      logger.error(error);
      toast({ title: 'Reply failed', description: error instanceof Error ? error.message : 'unknown error', variant: 'destructive' });
    }
  });
}
