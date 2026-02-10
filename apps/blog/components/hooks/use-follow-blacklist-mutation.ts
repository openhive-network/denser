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
 * Makes follow blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowBlacklistBlogMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const queryKey = ['follow_blacklist', user.username];

  const followBlacklistBlogMutation = useMutation({
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
      const broadcastResult = await transactionService.followBlacklistBlog(otherBlogs, blog, {
        observe: true
      });
      logger.info('Done follow blacklist blog transaction: %o', { otherBlogs, blog, broadcastResult });
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
        description: `The blog ${otherBlogs} has been added to your followed blacklist.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
      logger.info('useFollowBlacklistBlogMutation onSuccess data: %o', data);
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      } else if (context?.queryKey) {
        queryClient.removeQueries({ queryKey: context.queryKey });
      }

      handleError(error, {
        method: 'useFollowBlacklistBlogMutation',
        params: variables
      });
    }
  });

  return followBlacklistBlogMutation;
}

/**
 * Makes unfollow blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowBlacklistBlogMutation() {
  const { user } = useUserClient();
  const queryKey = ['follow_blacklist', user.username];
  const queryClient = useQueryClient();

  const unfollowBlacklistBlogMutation = useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      return { prevData, queryKey };
    },

    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unfollowBlacklistBlog(blog, { observe: true });
      logger.info('Done unfollow blacklist blog transaction: %o', { blog, broadcastResult });
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
        description: `The blog ${blog} has been removed from your followed blacklist.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
      logger.info('useUnfollowBlacklistBlogMutation onSuccess data: %o', data);
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      }

      handleError(error, {
        method: 'useUnfollowBlacklistBlogMutation',
        params: variables
      });
    }
  });

  return unfollowBlacklistBlogMutation;
}

/**
 * Makes reset follow blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetFollowBlacklistBlogMutation() {
  const { user } = useUserClient();
  const queryKey = ['follow_blacklist', user.username];
  const queryClient = useQueryClient();

  const resetFollowBlacklistBlogMutation = useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      queryClient.setQueryData<IFollowList[]>(queryKey, []);

      return { prevData, queryKey };
    },

    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowBlacklistBlog({ observe: true });
      logger.info('Done reset follow blacklist blog transaction: %o', { broadcastResult });
      return { broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      queryClient.setQueryData<IFollowList[]>(queryKey, []);
    },

    onSuccess: (data) => {
      toast({
        title: 'Follow blacklist reset successfully',
        description: 'All followed blogs have been removed from your blacklist.',
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
      logger.info('useResetFollowBlacklistBlogMutation onSuccess: %o', data);
    },

    onError: (error: unknown, _variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      }

      handleError(error, {
        method: 'useResetFollowBlacklistBlogMutation',
        params: {}
      });
    }
  });

  return resetFollowBlacklistBlogMutation;
}
