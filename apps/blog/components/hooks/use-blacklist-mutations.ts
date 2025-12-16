import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
const logger = getLogger('app');

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
    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.blacklistBlog(otherBlogs, blog, { observe: true });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done blacklist blog transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevData, otherBlogs } = data;
      if (prevData) {
        queryClient.setQueryData(queryKey, () => {
          const newItem = prevData.find((e) => e.name === otherBlogs)
            ? false
            : {
                name: otherBlogs,
                blacklist_description: '',
                muted_list_description: '',
                _temporary: true
              };
          return newItem ? [newItem, ...prevData] : prevData;
        });
      }
    },
    onSuccess: (data) => {
      const { otherBlogs } = data;
      toast({
        title: 'Blog blacklisted successfully',
        description: `The blog ${otherBlogs} has been added to your blacklist.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 4000);
    },
    onError: (error: any, variables) => {
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
    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unblacklistBlog(blog, { observe: true });

      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done unblacklist blog transaction: %o', response);

      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevData, blog } = data;
      if (prevData) {
        queryClient.setQueryData(queryKey, () => prevData.filter((e) => e.name !== blog));
      }
    },
    onSuccess: (data) => {
      const { blog } = data;
      logger.info('useUnblacklistBlogMutation onSuccess data: %o', data);
      toast({
        title: 'Blog unblacklisted successfully',
        description: `The blog ${blog} has been removed from your blacklist.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 4000);
    },
    onError: (error: any, variables) => {
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
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlacklistBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset blacklist blog transaction: %o', response);
      return response;
    },
    onSettled: () => {
      queryClient.setQueryData(queryKey, () => []);
    },
    onSuccess: (data) => {
      toast({
        title: 'Blacklist reset successfully',
        description: 'All blacklisted blogs have been removed.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 4000);
      logger.info('useResetBlacklistBlogMutation onSuccess: %o', data);
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useResetBlacklistBlogMutation',
        params: variables
      });
    }
  });

  return resetBlacklistBlogMutation;
}
