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
    toast: ({ otherBlogs }) => ({
      title: 'Blog followed successfully',
      description: `The blog ${otherBlogs} has been added to your followed blacklist.`
    })
  });

export const useUnfollowBlacklistBlogMutation = () =>
  useRemoveFromFollowListMutation('follow_blacklist', {
    name: 'useUnfollowBlacklistBlogMutation',
    run: ({ blog }) => transactionService.unfollowBlacklistBlog(blog, OBSERVE),
    toast: ({ blog }) => ({
      title: 'Blog unfollowed successfully',
      description: `The blog ${blog} has been removed from your followed blacklist.`
    })
  });

export const useResetFollowBlacklistBlogMutation = () =>
  useResetFollowListMutation('follow_blacklist', {
    name: 'useResetFollowBlacklistBlogMutation',
    run: () => transactionService.resetFollowBlacklistBlog(OBSERVE),
    toast: () => ({
      title: 'Follow blacklist reset successfully',
      description: 'All followed blogs have been removed from your blacklist.'
    })
  });
