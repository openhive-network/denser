import type { QueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { Entry } from '@hive/common-hiveio-packages/wax';
import {
  OBSERVE,
  useOperationMutation,
  type OperationToast
} from '@ui/components/hooks/use-operation-mutation';

type PinParams = { community: string; username: string; permlink: string };

function markPinnedPostTemporary(queryClient: QueryClient, { username, permlink }: PinParams) {
  const discussionData: Record<string, Entry> | undefined = queryClient.getQueryData([
    'discussionData',
    permlink
  ]);
  if (!discussionData) return;
  const updatedList = Object.values(discussionData).map((post) =>
    post.author === username && post.permlink === permlink
      ? { ...post, stats: { ...post.stats, _temporary: true } }
      : post
  );
  queryClient.setQueryData(
    ['discussionData', permlink],
    Object.fromEntries(updatedList.map((post) => [post.permlink, post]))
  );
}

function usePinStateMutation(
  name: string,
  broadcast: typeof transactionService.pin,
  successToast: OperationToast
) {
  return useOperationMutation({
    name,
    run: ({ community, username, permlink }: PinParams) => broadcast(community, username, permlink, OBSERVE),
    onSuccess: (_data, params, queryClient) => markPinnedPostTemporary(queryClient, params),
    successToast: () => successToast,
    invalidate: ({ permlink }) => [['discussionData', permlink]],
    invalidateDelays: [4000]
  });
}

/** Pins a post in a community. */
export const usePinMutation = () =>
  usePinStateMutation('usePinMutation', transactionService.pin, {
    title: 'Pinned',
    description: 'Post has been pinned successfully.'
  });

/** Unpins a post in a community. */
export const useUnpinMutation = () =>
  usePinStateMutation('useUnpinMutation', transactionService.unpin, {
    title: 'Unpinned',
    description: 'Post has been unpinned successfully.'
  });
