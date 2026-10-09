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
    toast: ({ otherBlogs }) => ({
      title: 'Blog blacklisted successfully',
      description: `The blog ${otherBlogs} has been added to your blacklist.`
    })
  });

export const useUnblacklistBlogMutation = () =>
  useRemoveFromFollowListMutation('blacklisted', {
    name: 'useUnblacklistBlogMutation',
    run: ({ blog }) => transactionService.unblacklistBlog(blog, OBSERVE),
    toast: ({ blog }) => ({
      title: 'Blog unblacklisted successfully',
      description: `The blog ${blog} has been removed from your blacklist.`
    })
  });

export const useResetBlacklistBlogMutation = () =>
  useResetFollowListMutation('blacklisted', {
    name: 'useResetBlacklistBlogMutation',
    run: () => transactionService.resetBlacklistBlog(OBSERVE),
    toast: () => ({
      title: 'Blacklist reset successfully',
      description: 'All blacklisted blogs have been removed.'
    })
  });
