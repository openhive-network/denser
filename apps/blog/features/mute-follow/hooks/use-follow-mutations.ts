import { useUser } from '@smart-signer/lib/auth/use-user';
import { UseInfiniteQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollow, IFollowList } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';

/**
 * Makes follow transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const followMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.follow(username, { observe: true });
      const prevIgnoredData: UseInfiniteQueryResult<IFollow[]>['data'] | undefined = queryClient.getQueryData(
        ['followingData', user.username, 'ignore']
      );
      const prevBlogData: UseInfiniteQueryResult<IFollow[]>['data'] | undefined = queryClient.getQueryData([
        'followingData',
        user.username,
        'blog'
      ]);
      const prevFollowersData: UseInfiniteQueryResult<IFollow[]>['data'] = queryClient.getQueryData([
        'followersData',
        username
      ]);
      const prevMuteData: IFollowList[] | undefined = queryClient.getQueryData(['muted', username]);
      const response = {
        ...params,
        broadcastResult,
        prevIgnoredData,
        prevBlogData,
        prevMuteData,
        prevFollowersData
      };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const {
        prevIgnoredData,
        prevBlogData,
        prevMuteData,
        prevFollowersData,
        username: otherUsername
      } = data;
      const { username } = user;
      if (!!prevIgnoredData) {
        // const newItem = prevIgnoredData.pages[0].find((e) => e.following === otherUsername)
        const newData = {
          ...prevIgnoredData,
          pages: [prevIgnoredData.pages[0].filter((e) => e.following !== otherUsername)]
        };
        queryClient.setQueryData(['followingData', username, 'ignore'], newData);
      }
      if (!!prevBlogData) {
        const newItem = { follower: username, following: otherUsername, what: ['blog'], _temporary: true };
        const newData = {
          ...prevBlogData,
          pages: [[newItem, ...prevBlogData.pages[0]]]
        };
        queryClient.setQueryData(['followingData', username, 'blog'], newData);
      }
      if (!!prevMuteData) {
        const newData = prevMuteData.filter((e) => e.name !== otherUsername);
        queryClient.setQueryData(['muted', otherUsername], newData);
      }
      if (!!prevFollowersData) {
        const newItem = { follower: username, following: otherUsername, what: ['blog'], _temporary: true };
        const newData = {
          ...prevFollowersData,
          pages: [[newItem, ...prevFollowersData.pages[0]]]
        };
        queryClient.setQueryData(['followersData', otherUsername], newData);
      }
    },
    onSuccess: (data) => {
      const { username } = user;
      const { username: otherUsername } = data;
      toast({
        title: 'Followed',
        description: `You are now following ${otherUsername}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['followingData', otherUsername] });
        queryClient.invalidateQueries({ queryKey: ['followingData', username] });
        queryClient.invalidateQueries({ queryKey: ['muted', username] });
        queryClient.invalidateQueries({ queryKey: ['followersData', otherUsername] });
        queryClient.invalidateQueries({ queryKey: ['profileData', username] });
        queryClient.invalidateQueries({ queryKey: ['profileData', otherUsername] });
      }, 4000);
    }
  });

  return followMutation;
}

/**
 * Makes unfollow transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unfollowMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.unfollow(username, { observe: true });
      const prevBlogData: UseInfiniteQueryResult<IFollow[]>['data'] | undefined = queryClient.getQueryData([
        'followingData',
        user.username,
        'blog'
      ]);

      const response = { ...params, broadcastResult, prevBlogData };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { username: otherUsername, prevBlogData } = data;
      const { username } = user;
      if (!!prevBlogData) {
        const newData = {
          ...prevBlogData,
          pages: [prevBlogData.pages[0].filter((e) => e.following !== otherUsername)]
        };
        queryClient.setQueryData(['followingData', username, 'blog'], newData);
      }
    },
    onSuccess: (data) => {
      const { username } = user;
      const { username: otherUsername } = data;
      toast({
        title: 'Unfollowed',
        description: `You have unfollowed ${otherUsername}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['followingData', otherUsername] });
        queryClient.invalidateQueries({ queryKey: ['followingData', username] });
        queryClient.invalidateQueries({ queryKey: ['followersData', otherUsername] });
        queryClient.invalidateQueries({ queryKey: ['profileData', username] });
        queryClient.invalidateQueries({ queryKey: ['profileData', otherUsername] });
      }, 4000);
    }
  });

  return unfollowMutation;
}

/**
 * Makes follow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
