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
    toast: ({ otherBlogs }) => ({
      title: 'Blog followed successfully',
      description: `The blog ${otherBlogs} has been added to your followed muted list.`
    })
  });

export const useUnfollowMutedBlogMutation = () =>
  useRemoveFromFollowListMutation('follow_muted', {
    name: 'useUnfollowMutedBlogMutation',
    run: ({ blog }) => transactionService.unfollowMutedBlog(blog, OBSERVE),
    toast: ({ blog }) => ({
      title: 'Blog unfollowed successfully',
      description: `The blog ${blog} has been removed from your followed muted list.`
    })
  });

export const useResetFollowMutedBlogMutation = () =>
  useResetFollowListMutation('follow_muted', {
    name: 'useResetFollowMutedBlogMutation',
    run: () => transactionService.resetFollowMutedBlog(OBSERVE),
    toast: () => ({
      title: 'Muted blogs reset successfully',
      description: 'Your followed muted blogs have been reset.'
    })
  });
