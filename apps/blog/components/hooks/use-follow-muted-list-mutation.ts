import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE } from '@ui/components/hooks/use-operation-mutation';
import {
  useAddToFollowListMutation,
  useRemoveFromFollowListMutation,
  useResetFollowListMutation
} from './use-follow-list-mutations';

export const useFollowMutedBlogMutation = () =>
  useAddToFollowListMutation('follow_muted', {
    name: 'useFollowMutedBlogMutation',
    run: ({ otherBlogs, blog }) => transactionService.followMutedBlog(otherBlogs, blog, OBSERVE),
    toast: (t, { otherBlogs }) => ({
      title: t('user_profile.list_toasts.list_followed_title'),
      description: t('user_profile.list_toasts.muted_list_followed_description', { blog: otherBlogs })
    })
  });

export const useUnfollowMutedBlogMutation = () =>
  useRemoveFromFollowListMutation('follow_muted', {
    name: 'useUnfollowMutedBlogMutation',
    run: ({ blog }) => transactionService.unfollowMutedBlog(blog, OBSERVE),
    toast: (t, { blog }) => ({
      title: t('user_profile.list_toasts.list_unfollowed_title'),
      description: t('user_profile.list_toasts.muted_list_unfollowed_description', { blog })
    })
  });

export const useResetFollowMutedBlogMutation = () =>
  useResetFollowListMutation('follow_muted', {
    name: 'useResetFollowMutedBlogMutation',
    run: () => transactionService.resetFollowMutedBlog(OBSERVE),
    toast: (t) => ({
      title: t('user_profile.list_toasts.followed_muted_lists_reset_title'),
      description: t('user_profile.list_toasts.followed_muted_lists_reset_description')
    })
  });
