import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes follow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowBlacklistBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = ['follow_blacklist', user.username];

  const followBlacklistBlogMutation = useMutation({
    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.followBlacklistBlog(otherBlogs, blog, {
        observe: true
      });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done follow blacklist blog transaction: %o', response);
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
        title: 'Blog followed successfully',
        description: `The blog ${otherBlogs} has been added to your followed blacklist.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 3000);
      logger.info('useFollowBlacklistBlogMutation onSuccess data: %o', data);
    }
  });

  return followBlacklistBlogMutation;
}

/**
 * Makes unfollow blacklistblog transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowBlacklistBlogMutation() {
  const { user } = useUser();
  const queryKey = ['follow_blacklist', user.username];
  const queryClient = useQueryClient();

  const unfollowBlacklistBlogMutation = useMutation({
    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unfollowBlacklistBlog(blog, { observe: true });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done unfollow blacklist blog transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevData, blog } = data;
      if (prevData) {
        queryClient.setQueryData(queryKey, () => {
          const newData = prevData.filter((e) => e.name !== blog);
          return newData.length ? newData : [];
        });
      }
    },
    onSuccess: (data) => {
      const { blog } = data;
      toast({
        title: 'Blog unfollowed successfully',
        description: `The blog ${blog} has been removed from your followed blacklist.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 3000);
      logger.info('useUnfollowBlacklistBlogMutation onSuccess data: %o', data);
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
  const { user } = useUser();
  const queryKey = ['follow_blacklist', user.username];
  const queryClient = useQueryClient();

  const resetFollowBlacklistBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowBlacklistBlog({ observe: true });

      const response = { broadcastResult };
      logger.info('Done reset follow blacklist blog transactio: %o', response);
      return response;
    },
    onSettled: () => {
      queryClient.setQueryData(queryKey, () => []);
    },

    onSuccess: (data) => {
      toast({
        title: 'Follow blacklist reset successfully',
        description: 'All followed blogs have been removed from your blacklist.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 3000);
      logger.info('useResetFollowBlacklistBlogMutation onSuccess: %o', data);
    }
  });

  return resetFollowBlacklistBlogMutation;
}
