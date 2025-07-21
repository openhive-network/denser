import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes blacklist blog transaction.
 *
 * @export
 * @return {*}
 */
export function useBlacklistBlogMutation() {
  const { user } = useUser();
  //
  const queryClient = useQueryClient();
  const blacklistBlogMutation = useMutation({
    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.blacklistBlog(otherBlogs, blog, { observe: true });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(['blacklisted', user.username]);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done blacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      const { prevData, otherBlogs } = data;
      const queryKey = ['blacklisted', username];
      if (prevData) {
        const newItem = prevData.find((e) => e.name === otherBlogs)
          ? null
          : {
              name: otherBlogs,
              blacklist_description: '',
              muted_list_description: '',
              _temporary: true
            };
        queryClient.setQueryData(queryKey, () => [newItem, ...prevData]);
      }
      toast({
        title: 'Blog blacklisted successfully',
        description: `The blog ${otherBlogs} has been added to your blacklist.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 3000);
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
  const { user } = useUser();
  const queryClient = useQueryClient();
  const unblacklistBlogMutation = useMutation({
    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unblacklistBlog(blog, { observe: true });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(['blacklisted', user.username]);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done unblacklist blog transaction: %o', response);

      return response;
    },
    onSuccess: (data) => {
      logger.info('useUnblacklistBlogMutation onSuccess data: %o', data);
      const { prevData, blog } = data;
      const { username } = user;
      const queryKey = ['blacklisted', username];
      if (prevData) {
        queryClient.setQueryData(queryKey, () => prevData.filter((e) => e.name !== blog));
      }
      toast({
        title: 'Blog unblacklisted successfully',
        description: `The blog ${blog} has been removed from your blacklist.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 3000);
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
  const { user } = useUser();
  const queryClient = useQueryClient();
  const resetBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetBlacklistBlog({ observe: true });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(['blacklisted', user.username]);
      const response = { broadcastResult, prevData };
      logger.info('Done reset blacklist blog transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const { username } = user;
      const { prevData } = data;
      const queryKey = ['blacklisted', username];
      if (prevData) {
        queryClient.setQueryData(queryKey, () => []);
      }
      toast({
        title: 'Blacklist reset successfully',
        description: 'All blacklisted blogs have been removed.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 3000);
      logger.info('useResetBlacklistBlogMutation onSuccess: %o', data);
    }
  });

  return resetBlacklistBlogMutation;
}
