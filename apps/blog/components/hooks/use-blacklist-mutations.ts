import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations } from '@/blog/lib/react-query';

const logger = getLogger('app');

/** Add item to IFollowList cache if not already present. */
function addToListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: string[],
  name: string
) {
  const currentData: IFollowList[] = queryClient.getQueryData(queryKey) ?? [];
  if (!currentData.some((e) => e.name === name)) {
    queryClient.setQueryData<IFollowList[]>(queryKey, [
      { name, blacklist_description: '', muted_list_description: '', _temporary: true },
      ...currentData
    ]);
  }
}

/** Remove item from IFollowList cache. */
function removeFromListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: string[],
  name: string
) {
  const currentData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
  if (currentData) {
    queryClient.setQueryData<IFollowList[]>(queryKey, currentData.filter((e) => e.name !== name));
  }
}

/**
 * Makes blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useBlacklistBlogMutation() {
  const { user } = useUserClient();
  const queryKey = ['blacklisted', user.username];
  const queryClient = useQueryClient();

  const blacklistBlogMutation = useMutation({
    onMutate: async (params: { otherBlogs: string; blog?: string }) => {
      await queryClient.cancelQueries({ queryKey });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      addToListCache(queryClient, queryKey, params.otherBlogs);
      return { prevData, queryKey };
    },

    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.blacklistBlog(otherBlogs, blog, { observe: true });
      logger.info('Done blacklist blog transaction: %o', { otherBlogs, blog, broadcastResult });
      return { ...params, broadcastResult };
    },

    // Re-apply optimistic cache after mutation settles (success or error).
    // This is the safety net: if a window-focus refetch during the observe:true
    // broadcast overwrote onMutate data, this restores it.
    onSettled: (data) => {
      if (!data) return;
      addToListCache(queryClient, queryKey, data.otherBlogs);
    },

    onSuccess: (data) => {
      const { otherBlogs } = data;
      toast({
        title: 'Blog blacklisted successfully',
        description: `The blog ${otherBlogs} has been added to your blacklist.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      } else if (context?.queryKey) {
        queryClient.removeQueries({ queryKey: context.queryKey });
      }

      handleError(error, {
        method: 'useBlacklistBlogMutation',
        params: variables
      });
    }
  });

  return blacklistBlogMutation;
}

/**
 * Makes unblacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useUnblacklistBlogMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const queryKey = ['blacklisted', user.username];

  const unblacklistBlogMutation = useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      return { prevData, queryKey };
    },

    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unblacklistBlog(blog, { observe: true });
      logger.info('Done unblacklist blog transaction: %o', { blog, broadcastResult });
      return { ...params, broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      removeFromListCache(queryClient, queryKey, data.blog);
    },

    onSuccess: (data) => {
      const { blog } = data;
      logger.info('useUnblacklistBlogMutation onSuccess data: %o', data);
      toast({
        title: 'Blog unblacklisted successfully',
        description: `The blog ${blog} has been removed from your blacklist.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
    },

    onError: (error: unknown, variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      }

      handleError(error, {
        method: 'useUnblacklistBlogMutation',
        params: variables
      });
    }
  });

  return unblacklistBlogMutation;
}

/**
 * Makes reset blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useResetBlacklistBlogMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const queryKey = ['blacklisted', user.username];

  const resetBlacklistBlogMutation = useMutation({
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      queryClient.setQueryData<IFollowList[]>(queryKey, []);
      return { prevData, queryKey };
    },

    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlacklistBlog({ observe: true });
      logger.info('Done reset blacklist blog transaction: %o', { broadcastResult });
      return { broadcastResult };
    },

    onSettled: (data) => {
      if (!data) return;
      queryClient.setQueryData<IFollowList[]>(queryKey, []);
    },

    onSuccess: (data) => {
      toast({
        title: 'Blacklist reset successfully',
        description: 'All blacklisted blogs have been removed.',
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [queryKey, ['entriesInfinite']], [4000, 10000, 20000]);
      logger.info('useResetBlacklistBlogMutation onSuccess: %o', data);
    },

    onError: (error: unknown, _variables, context) => {
      if (context?.prevData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.prevData);
      }

      handleError(error, {
        method: 'useResetBlacklistBlogMutation',
        params: {}
      });
    }
  });

  return resetBlacklistBlogMutation;
}
