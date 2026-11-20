import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE } from '@ui/components/hooks/use-operation-mutation';
import {
  useAddToFollowListMutation,
  useRemoveFromFollowListMutation,
  useResetFollowListMutation
} from './use-follow-list-mutations';

export const useFollowBlacklistBlogMutation = () =>
  useAddToFollowListMutation('follow_blacklist', {
    name: 'useFollowBlacklistBlogMutation',
    run: ({ otherBlogs, blog }) => transactionService.followBlacklistBlog(otherBlogs, blog, OBSERVE),
    toast: (t, { otherBlogs }) => ({
      title: t('user_profile.list_toasts.list_followed_title'),
      description: t('user_profile.list_toasts.blacklist_followed_description', { blog: otherBlogs })
    })
  });

export const useUnfollowBlacklistBlogMutation = () =>
  useRemoveFromFollowListMutation('follow_blacklist', {
    name: 'useUnfollowBlacklistBlogMutation',
    run: ({ blog }) => transactionService.unfollowBlacklistBlog(blog, OBSERVE),
    toast: (t, { blog }) => ({
      title: t('user_profile.list_toasts.list_unfollowed_title'),
      description: t('user_profile.list_toasts.blacklist_unfollowed_description', { blog })
    })
  });

export const useResetFollowBlacklistBlogMutation = () =>
  useResetFollowListMutation('follow_blacklist', {
    name: 'useResetFollowBlacklistBlogMutation',
    run: () => transactionService.resetFollowBlacklistBlog(OBSERVE),
    toast: (t) => ({
      title: t('user_profile.list_toasts.followed_blacklists_reset_title'),
      description: t('user_profile.list_toasts.followed_blacklists_reset_description')
    })
  });
