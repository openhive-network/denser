import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { updateOwnListsAfterChange } from '@transaction/lib/observer-lists';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import type { InfiniteFollowData } from '../lib/follow-cache';
import { addToListCache, removeFromListCache, restoreList, snapshotList } from '@/blog/lib/follow-list-cache';
import { applyMute } from '../lib/mute-cache';
import { postSocialChanged } from '@/blog/lib/social-sync';

type MuteParams = { username: string };

export function useMuteMutation() {
  const { username } = useUserClient().user;
  const mutedQueryKey = ['muted', username];
  return useOperationMutation({
    name: 'useMuteMutation',
    optimistic: async (params: MuteParams, queryClient) => {
      const snapshot = await snapshotList(queryClient, mutedQueryKey);
      addToListCache(queryClient, mutedQueryKey, params.username);
      return snapshot;
    },
    run: ({ username: otherUsername }: MuteParams) => transactionService.mute(otherUsername, '', OBSERVE),
    onSuccess: (_data, params, queryClient) => {
      applyMute(queryClient, username, params.username);
      updateOwnListsAfterChange(username, true);
      postSocialChanged(username);
    },
    rollback: (context, _params, queryClient) => restoreList(queryClient, mutedQueryKey, context),
    successToast: (_data, params) => ({ title: 'Muted', description: `You have muted ${params.username}.` }),
    invalidate: ({ username: otherUsername }) => [
      ['followingData', otherUsername],
      ['followingData', username],
      ['muted', username],
      ['followersData', otherUsername],
      ['profileData', username],
      ['profileData', otherUsername],
      ['discussionData'],
      ['entriesInfinite']
    ],
    invalidateDelays: [4000]
  });
}

export function useUnmuteMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useUnmuteMutation',
    run: ({ username: otherUsername }: MuteParams) => transactionService.unmute(otherUsername, OBSERVE),
    onSuccess: (_data, { username: otherUsername }, queryClient) => {
      removeFromListCache(queryClient, ['muted', username], otherUsername);
      updateOwnListsAfterChange(username, false);
      postSocialChanged(username);
      const ignoreKey = ['followingData', username, 'ignore'];
      const prevFollowingData: InfiniteFollowData = queryClient.getQueryData(ignoreKey);
      if (prevFollowingData) {
        queryClient.setQueryData(ignoreKey, {
          ...prevFollowingData,
          pages: [prevFollowingData.pages[0].filter((e) => e.following !== otherUsername)]
        });
      }
    },
    successToast: (_data, params) => ({
      title: 'Unmuted',
      description: `You have unmuted ${params.username}.`
    }),
    invalidate: ({ username: otherUsername }) => [
      ['muted', username],
      ['followingData', username, 'ignore'],
      ['profileData', username],
      ['profileData', otherUsername],
      ['discussionData'],
      ['entriesInfinite']
    ],
    invalidateDelays: [4000]
  });
}

export function useResetBlogListMutation() {
  const { username } = useUserClient().user;
  const mutedQueryKey = ['muted', username];
  return useOperationMutation({
    name: 'useResetBlogListMutation',
    optimistic: async (_params: void, queryClient) => {
      const snapshot = await snapshotList(queryClient, mutedQueryKey);
      queryClient.setQueryData<IFollowList[]>(mutedQueryKey, []);
      return snapshot;
    },
    run: () => transactionService.resetBlogList(OBSERVE),
    onSuccess: () => {
      updateOwnListsAfterChange(username, false);
      postSocialChanged(username);
    },
    rollback: (context, _params, queryClient) => restoreList(queryClient, mutedQueryKey, context),
    successToast: () => ({ title: 'Blog list reset', description: 'Your blog list has been reset.' }),
    invalidate: () => [mutedQueryKey, ['profileData', username], ['entriesInfinite']],
    invalidateDelays: [4000]
  });
}
