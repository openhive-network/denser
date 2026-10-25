import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { FullAccount, IFollow } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { postSocialChanged } from '@/blog/lib/social-sync';
import {
  clearFollowingCaches,
  filterFromAllPages,
  prependToFirstPage,
  rollbackFollowCaches,
  snapshotFollowCaches,
  updateProfileFollowCounts,
  type InfiniteFollowData
} from '../lib/follow-cache';

type FollowParams = { username: string };

const FOLLOW_REFRESH_DELAYS = [8000, 16000, 30000];

export function useFollowMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useFollowMutation',
    mutationKey: ['follow'],
    optimistic: async ({ username: otherUsername }: FollowParams, queryClient) => {
      const snapshot = await snapshotFollowCaches(queryClient, username, otherUsername);
      snapshot.prevMuteData = queryClient.getQueryData(['muted', otherUsername]);
      const newItem: IFollow = {
        follower: username,
        following: otherUsername,
        what: ['blog'],
        _temporary: true
      };
      for (const [key, data] of snapshot.prevFollowingAll) {
        if (!data) continue;
        const ignore = key[2] === 'ignore';
        queryClient.setQueryData(
          key,
          ignore ? filterFromAllPages(data, otherUsername) : prependToFirstPage(data, newItem)
        );
      }
      if (snapshot.prevFollowers) {
        queryClient.setQueryData(
          ['followersData', otherUsername],
          prependToFirstPage(snapshot.prevFollowers, newItem)
        );
      }
      if (snapshot.prevMuteData) {
        queryClient.setQueryData(
          ['muted', otherUsername],
          snapshot.prevMuteData.filter((e) => e.name !== otherUsername)
        );
      }
      updateProfileFollowCounts(queryClient, username, otherUsername, 1);
      return snapshot;
    },
    run: ({ username: otherUsername }: FollowParams) => transactionService.follow(otherUsername, OBSERVE),
    rollback: (context, { username: otherUsername }, queryClient) =>
      rollbackFollowCaches(queryClient, username, otherUsername, context),
    onSuccess: () => postSocialChanged(username),
    successToast: (_data, { username: otherUsername }) => ({
      title: 'Followed',
      description: `You are now following ${otherUsername}.`
    }),
    invalidate: ({ username: otherUsername }) => [
      ['followingData', otherUsername],
      ['followingData', username],
      ['muted', username],
      ['followersData', otherUsername],
      ['profileData', username],
      ['profileData', otherUsername]
    ],
    invalidateDelays: FOLLOW_REFRESH_DELAYS
  });
}

export function useUnfollowMutation() {
  const { username } = useUserClient().user;
  return useOperationMutation({
    name: 'useUnfollowMutation',
    mutationKey: ['unfollow'],
    optimistic: async ({ username: otherUsername }: FollowParams, queryClient) => {
      const snapshot = await snapshotFollowCaches(queryClient, username, otherUsername);
      for (const [key, data] of snapshot.prevFollowingAll) {
        if (!data || key[2] === 'ignore') continue;
        queryClient.setQueryData(key, filterFromAllPages(data, otherUsername));
      }
      if (snapshot.prevFollowers) {
        queryClient.setQueryData(
          ['followersData', otherUsername],
          filterFromAllPages(snapshot.prevFollowers, username, 'follower')
        );
      }
      updateProfileFollowCounts(queryClient, username, otherUsername, -1);
      return snapshot;
    },
    run: ({ username: otherUsername }: FollowParams) => transactionService.unfollow(otherUsername, OBSERVE),
    rollback: (context, { username: otherUsername }, queryClient) =>
      rollbackFollowCaches(queryClient, username, otherUsername, context),
    onSuccess: () => postSocialChanged(username),
    successToast: (_data, { username: otherUsername }) => ({
      title: 'Unfollowed',
      description: `You have unfollowed ${otherUsername}.`
    }),
    invalidate: ({ username: otherUsername }) => [
      ['followingData', otherUsername],
      ['followingData', username],
      ['followersData', otherUsername],
      ['profileData', username],
      ['profileData', otherUsername]
    ],
    invalidateDelays: FOLLOW_REFRESH_DELAYS
  });
}

/** Unfollows every account the signed-in user follows, in one `reset_following_list` operation. */
export function useResetFollowingMutation() {
  const { username } = useUserClient().user;
  const followingKey = ['followingData', username];
  const profileKey = ['profileData', username];
  return useOperationMutation({
    name: 'useResetFollowingMutation',
    mutationKey: ['unfollowAll'],
    optimistic: async (_params: void, queryClient) => {
      await Promise.all([followingKey, profileKey].map((queryKey) => queryClient.cancelQueries({ queryKey })));
      const snapshot = {
        prevFollowingAll: queryClient.getQueriesData<InfiniteFollowData>({ queryKey: followingKey }),
        prevProfile: queryClient.getQueryData<FullAccount>(profileKey)
      };
      clearFollowingCaches(queryClient, username);
      return snapshot;
    },
    run: () => transactionService.resetFollowingBlog(OBSERVE),
    // Re-applied after the broadcast: a refetch during an observed broadcast can overwrite the optimistic write.
    onSuccess: (_data, _params, queryClient) => {
      clearFollowingCaches(queryClient, username);
      postSocialChanged(username);
    },
    rollback: (context, _params, queryClient) => {
      if (!context) return;
      for (const [key, data] of context.prevFollowingAll) queryClient.setQueryData(key, data);
      if (context.prevProfile !== undefined) queryClient.setQueryData(profileKey, context.prevProfile);
    },
    successToast: () => ({
      title: 'Unfollowed all',
      description: 'You no longer follow anyone.'
    }),
    invalidate: () => [followingKey, profileKey],
    invalidateDelays: FOLLOW_REFRESH_DELAYS
  });
}
