'use client';

import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postLiteReply } from '@hiveio/lite-account';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { discussionKey, fetchDiscussion } from '../post-rendering/lib/discussion-cache';
import { LITE_RELAY_ENDPOINT } from './use-lite-relay-info';
import { hasIndexedReply, withOptimisticReply, withRelayedReply, type Discussion, type LiteReplyVariables } from './lite-reply-optimistic';

const logger = getLogger('app');

/** Posts a guest reply through the relay with an optimistic cache insert, like useCommentMutation. */
export function useLiteReplyMutation(onFirstPostSucceeded: () => void) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  return useMutation({
    onMutate: async (v: LiteReplyVariables) => {
      const queryKey = discussionKey(v);
      cleanupRef.current?.();
      cleanupRef.current = null;
      await queryClient.cancelQueries({ queryKey });
      const prevData: Discussion | undefined = queryClient.getQueryData(queryKey);
      queryClient.setQueryData<Discussion>(queryKey, withOptimisticReply(prevData, v));
      return { prevData, queryKey };
    },
    mutationFn: async (v: LiteReplyVariables) => {
      const result = await postLiteReply(LITE_RELAY_ENDPOINT, v.built.request);
      logger.info('Lite reply relayed: %o', result);
      return { ...v, result };
    },
    onSuccess: (data) => {
      if (data.built.request.register_tx) onFirstPostSucceeded();
      queryClient.setQueryData<Discussion>(discussionKey(data), (prev: Discussion | undefined) => withRelayedReply(prev, data, data.result.l1_author));
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        discussionKey(data),
        () => fetchDiscussion(data),
        (fresh: Discussion | null) => hasIndexedReply(fresh, data, data.result.permlink)
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
