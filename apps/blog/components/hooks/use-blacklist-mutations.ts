import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE } from '@ui/components/hooks/use-operation-mutation';
import {
  useAddToFollowListMutation,
  useRemoveFromFollowListMutation,
  useResetFollowListMutation
} from './use-follow-list-mutations';

export const useBlacklistBlogMutation = () =>
  useAddToFollowListMutation('blacklisted', {
    name: 'useBlacklistBlogMutation',
    run: ({ otherBlogs, blog }) => transactionService.blacklistBlog(otherBlogs, blog, OBSERVE),
    toast: (t, { otherBlogs }) => ({
      title: t('user_profile.list_toasts.blacklisted_title'),
      description: t('user_profile.list_toasts.blacklisted_description', { blog: otherBlogs })
    })
  });

export const useUnblacklistBlogMutation = () =>
  useRemoveFromFollowListMutation('blacklisted', {
    name: 'useUnblacklistBlogMutation',
    run: ({ blog }) => transactionService.unblacklistBlog(blog, OBSERVE),
    toast: (t, { blog }) => ({
      title: t('user_profile.list_toasts.unblacklisted_title'),
      description: t('user_profile.list_toasts.unblacklisted_description', { blog })
    })
  });

export const useResetBlacklistBlogMutation = () =>
  useResetFollowListMutation('blacklisted', {
    name: 'useResetBlacklistBlogMutation',
    run: () => transactionService.resetBlacklistBlog(OBSERVE),
    toast: (t) => ({
      title: t('user_profile.list_toasts.blacklist_reset_title'),
      description: t('user_profile.list_toasts.blacklist_reset_description')
    })
  });
