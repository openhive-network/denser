import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes follow muted transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutedBlogMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = ['follow_muted', user.username];

  const followMutedBlogMutation = useMutation({
    mutationFn: async (params: { otherBlogs: string; blog?: string }) => {
      const { otherBlogs, blog } = params;
      const broadcastResult = await transactionService.followMutedBlog(otherBlogs, blog, { observe: true });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done follow muted blog transaction: %o', response);
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
        description: `The blog ${otherBlogs} has been added to your followed muted list.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 4000);
      logger.info('useFollowMutedBlogMutation onSuccess data: %o', data);
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
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = ['follow_muted', user.username];

  const unfollowMutedBlogMutation = useMutation({
    mutationFn: async (params: { blog: string }) => {
      const { blog } = params;
      const broadcastResult = await transactionService.unfollowMutedBlog(blog, { observe: true });
      const prevData: IFollowList[] | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done unfollow muted blog transaction: %o', response);
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
        description: `The blog ${blog} has been removed from your followed muted list.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 4000);
      logger.info('useUnfollowMutedBlogMutation onSuccess data: %o', data);
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
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = ['follow_muted', user.username];

  const resetFollowMutedBlogMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetFollowMutedBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset follow muted blog transaction: %o', response);
      return response;
    },
    onSettled: () => {
      queryClient.setQueryData(queryKey, []);
    },
    onSuccess: (data) => {
      toast({
        title: 'Muted blogs reset successfully',
        description: 'Your followed muted blogs have been reset.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 4000);
      logger.info('useResetFollowMutedBlogMutation onSuccess: %o', data);
    }
  });

  return resetFollowMutedBlogMutation;
}
