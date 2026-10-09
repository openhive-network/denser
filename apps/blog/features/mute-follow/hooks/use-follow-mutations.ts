import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { IFollow } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import {
  filterFromAllPages,
  prependToFirstPage,
  rollbackFollowCaches,
  snapshotFollowCaches,
  updateProfileFollowCounts
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
