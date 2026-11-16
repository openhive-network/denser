'use client';

import { useEffect } from 'react';
import { PostListSkeleton } from '@hive/ui';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import SortedPagesPosts from '@/blog/features/tags-pages/list-of-posts';
import ForYouSignIn from '@/blog/features/tags-pages/for-you-sign-in';
import { useTrendingOnSignOut } from '@/blog/features/tags-pages/use-trending-on-sign-out';
import { endSignOutLeave, useIsLeavingOnSignOut } from '@/blog/features/tags-pages/sign-out-leave';
import { useInitialPosts } from '@/blog/components/observer-provider';
import { FOR_YOU_SORT } from '@/blog/lib/utils';

const Content = () => {
  const { user, isHydrated } = useUserClient();
  const hasSignedOut = useTrendingOnSignOut(user.isLoggedIn, isHydrated);
  const isLeaving = useIsLeavingOnSignOut();
  // The server read the first page for the observer cookie's account: the list hydrates from it
  const hasServerPage = useInitialPosts() !== null;
  useEffect(() => endSignOutLeave, []);
  if (hasSignedOut || isLeaving) return <PostListSkeleton count={5} />;
  if (!isHydrated) return hasServerPage ? <SortedPagesPosts sort={FOR_YOU_SORT} /> : <PostListSkeleton count={5} />;
  if (!user.isLoggedIn) return <ForYouSignIn />;
  return <SortedPagesPosts sort={FOR_YOU_SORT} />;
};

export default Content;
