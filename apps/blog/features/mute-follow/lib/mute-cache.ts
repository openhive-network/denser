import type { QueryClient } from '@tanstack/react-query';
import { IFollowList } from '@hive/common-hiveio-packages/wax';
import { addToListCache } from '@/blog/lib/follow-list-cache';
import type { InfiniteFollowData } from './follow-cache';

/** Moves the muted account from the blog to the ignore following list, as the mute lists show it. */
export function applyMute(queryClient: QueryClient, username: string, otherUsername: string) {
  const ignoreKey = ['followingData', username, 'ignore'];
  const blogKey = ['followingData', username, 'blog'];
  const prevIgnoredData: InfiniteFollowData = queryClient.getQueryData(ignoreKey);
  const prevBlogData: InfiniteFollowData = queryClient.getQueryData(blogKey);
  const prevFollowersData: InfiniteFollowData = queryClient.getQueryData(['followersData', otherUsername]);
  const prevMuteData: IFollowList[] | undefined = queryClient.getQueryData(['muted', otherUsername]);
  const newItem = { follower: username, following: otherUsername, what: ['blog'], _temporary: true };
  if (prevIgnoredData) {
    queryClient.setQueryData(ignoreKey, { ...prevBlogData, pages: [[newItem, ...prevIgnoredData.pages[0]]] });
  }
  if (prevBlogData) {
    const pages = [prevBlogData.pages[0].filter((e) => e.following !== otherUsername)];
    queryClient.setQueryData(blogKey, { ...prevIgnoredData, pages });
  }
  if (prevFollowersData) {
    const pages = [[newItem, ...prevFollowersData.pages[0]]];
    queryClient.setQueryData(['followersData', otherUsername], { ...prevFollowersData, pages });
  }
  if (prevMuteData) {
    queryClient.setQueryData(
      ['muted', otherUsername],
      prevMuteData.filter((e) => e.name !== otherUsername)
    );
  }
  // Re-applied after the broadcast: a refetch during an observed broadcast can overwrite the optimistic write.
  addToListCache(queryClient, ['muted', username], otherUsername);
}
