import { useUser } from '@smart-signer/lib/auth/use-user';
import { UseInfiniteQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollow, IFollowList } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Makes mute transaction.
 *
 * @export
 * @return {*}
 */
export function useMuteMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.mute(username, '', { observe: true });
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
        prevFollowersData,
        prevMuteData
      };

      return response;
    },
    onSettled: (data) => {
      const { username } = user;
      if (!data) return;
      const { username: otherUsername } = data;
      const { prevIgnoredData, prevBlogData, prevFollowersData, prevMuteData } = data;
      if (!!prevIgnoredData) {
        const newItem = { follower: username, following: otherUsername, what: ['blog'], _temporary: true };
        const newData = {
          ...prevBlogData,
          pages: [[newItem, ...prevIgnoredData.pages[0]]]
        };
        queryClient.setQueryData(['followingData', username, 'ignore'], newData);
      }
      if (!!prevBlogData) {
        const newData = {
          ...prevIgnoredData,
          pages: [prevBlogData.pages[0].filter((e) => e.following !== otherUsername)]
        };
        queryClient.setQueryData(['followingData', username, 'blog'], newData);
      }
      if (!!prevFollowersData) {
        const newItem = { follower: username, following: otherUsername, what: ['blog'], _temporary: true };
        const newData = {
          ...prevFollowersData,
          pages: [[newItem, ...prevFollowersData.pages[0]]]
        };
        queryClient.setQueryData(['followersData', otherUsername], newData);
      }
      if (!!prevMuteData) {
        const newData = prevMuteData.filter((e) => e.name !== otherUsername);
        queryClient.setQueryData(['muted', otherUsername], newData);
      }
    },
    onSuccess: (data) => {
      const { username } = user;
      const { username: otherUsername } = data;
      toast({
        title: 'Muted',
        description: `You have muted ${otherUsername}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['followingData', otherUsername] });
        queryClient.invalidateQueries({ queryKey: ['followingData', username] });
        queryClient.invalidateQueries({ queryKey: ['muted', username] });
        queryClient.invalidateQueries({ queryKey: ['followersData', otherUsername] });
        queryClient.invalidateQueries({ queryKey: ['profileData', username] });
        queryClient.invalidateQueries({ queryKey: ['profileData', otherUsername] });
      }, 3000);
    }
  });
}

/**
 * Makes unmute transaction.
 *
 * @export
 * @return {*}
 */
export function useUnmuteMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unmuteMutation = useMutation({
    mutationFn: async (params: { username: string }) => {
      const { username } = params;
      const broadcastResult = await transactionService.unmute(username, { observe: true });
      const prevMutedList: IFollowList[] | undefined = queryClient.getQueryData(['muted', user.username]);
      const prevFollowingData: UseInfiniteQueryResult<IFollow[]>['data'] | undefined =
        queryClient.getQueryData(['followingData', user.username, 'ignore']);
      const response = { ...params, broadcastResult, prevMutedList, prevFollowingData };
      logger.info('Done unmute transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { username } = user;
      const { username: otherUsername, prevMutedList, prevFollowingData } = data;
      const newMutedList = prevMutedList?.filter((e) => e.name !== otherUsername);
      if (prevMutedList) {
        queryClient.setQueryData(['muted', username], () => newMutedList);
      }
      if (prevFollowingData) {
        const newFollowingData = prevFollowingData.pages[0].filter((e) => e.following !== otherUsername);
        queryClient.setQueryData(['followingData', username, 'ignore'], () => ({
          ...prevFollowingData,
          pages: [newFollowingData]
        }));
      }
    },
    onSuccess: (data) => {
      const { username } = user;
      const { username: otherUsername } = data;

      toast({
        title: 'Unmuted',
        description: `You have unmuted ${otherUsername}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['muted', username] });
        queryClient.invalidateQueries({ queryKey: ['followingData', username, 'ignore'] });
        queryClient.invalidateQueries({ queryKey: ['profileData', username] });
        queryClient.invalidateQueries({ queryKey: ['profileData', otherUsername] });

        logger.info('useUnmuteMutation onSuccess data: %o', data);
      }, 3000);
    }
  });

  return unmuteMutation;
}

/**
 * Makes reset blog list transaction.
 *
 * @export
 * @return {*}
 */
export function useResetBlogListMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const resetBlogListMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlogList({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset blog list transaction: %o', response);
      return response;
    },
    onSettled() {
      const { username } = user;
      queryClient.setQueryData(['muted', username], () => []);
    },
    onSuccess: (data) => {
      const { username } = user;
      toast({
        title: 'Blog list reset',
        description: 'Your blog list has been reset.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.setQueryData(['muted', username], () => []);
        queryClient.invalidateQueries({ queryKey: ['muted', username] });
        queryClient.invalidateQueries({ queryKey: ['profileData', username] });
        logger.info('useResetBlogListMutation onSuccess: %o', data);
      }, 3000);
    }
  });

  return resetBlogListMutation;
}
