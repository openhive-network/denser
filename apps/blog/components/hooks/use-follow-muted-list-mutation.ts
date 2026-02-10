import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations } from '@/blog/lib/react-query';

const logger = getLogger('app');

/**
 * Makes follow muted transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutedBlogMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const queryKey = ['follow_muted', user.username];

  const followMutedBlogMutation = useMutation({
    onMutate: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs } = params;

      await queryClient.cancelQueries({ queryKey });

      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      const currentData = prevData ?? [];

      const alreadyExists = currentData.some((e) => e.name === otherBlogs);
      if (!alreadyExists) {
        queryClient.setQueryData<IFollowList[]>(queryKey, [
          { name: otherBlogs, blacklist_description: '', muted_list_description: '', _temporary: true },
          ...currentData
        ]);
      }

      return { prevData, queryKey };
    },

    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.followMutedBlog(otherBlogs, blog, { observe: true });
      logger.info('Done follow muted blog transaction: %o', { otherBlogs, blog, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      const { otherBlogs } = data;
      const currentData: IFollowList[] = queryClient.getQueryData(queryKey) ?? [];
      if (!currentData.some((e) => e.name === otherBlogs)) {
        queryClient.setQueryData<IFollowList[]>(queryKey, [
          { name: otherBlogs, blacklist_description: '', muted_list_description: '', _temporary: true },
          ...currentData
        ]);
      }
    },

    onSuccess: (data) => {
      const { otherBlogs } = data;
      toast({
        title: 'Blog followed successfully',
        description: `The blog ${otherBlogs} has been added to your followed muted list.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
      logger.info('useFollowMutedBlogMutation onSuccess data: %o', data);
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      } else if (context?.queryKey) {
        queryClient.removeQueries({ queryKey: context.queryKey });
      }

      handleError(error, {
        method: 'useFollowMutedBlogMutation',
        params: variables
      });
    }
  });

  return followMutedBlogMutation;
}

/**
 * Makes unfollow muted transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowMutedBlogMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const queryKey = ['follow_muted', user.username];

  const unfollowMutedBlogMutation = useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      return { prevData, queryKey };
    },

    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unfollowMutedBlog(blog, { observe: true });
      logger.info('Done unfollow muted blog transaction: %o', { blog, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      const { blog } = data;
      const currentData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      if (currentData) {
        queryClient.setQueryData<IFollowList[]>(queryKey, currentData.filter((e) => e.name !== blog));
      }
    },

    onSuccess: (data) => {
      const { blog } = data;
      toast({
        title: 'Blog unfollowed successfully',
        description: `The blog ${blog} has been removed from your followed muted list.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
      logger.info('useUnfollowMutedBlogMutation onSuccess data: %o', data);
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      }

      handleError(error, {
        method: 'useUnfollowMutedBlogMutation',
        params: variables
      });
    }
  });

  return unfollowMutedBlogMutation;
}

/**
 * Makes reset follow muted blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetFollowMutedBlogMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const queryKey = ['follow_muted', user.username];

  const resetFollowMutedBlogMutation = useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      queryClient.setQueryData<IFollowList[]>(queryKey, []);

      return { prevData, queryKey };
    },

    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowMutedBlog({ observe: true });
      logger.info('Done reset follow muted blog transaction: %o', { broadcastResult });
      return { broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      queryClient.setQueryData<IFollowList[]>(queryKey, []);
    },

    onSuccess: (data) => {
      toast({
        title: 'Muted blogs reset successfully',
        description: 'Your followed muted blogs have been reset.',
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
      logger.info('useResetFollowMutedBlogMutation onSuccess: %o', data);
    },

    onError: (error: unknown, _variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      }

      handleError(error, {
        method: 'useResetFollowMutedBlogMutation',
        params: {}
      });
    }
  });

  return resetFollowMutedBlogMutation;
}
