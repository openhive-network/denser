'use client';

import { PostListSkeleton } from '@hive/ui';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import SortedPagesPosts from '@/blog/features/tags-pages/list-of-posts';
import ForYouSignIn from '@/blog/features/tags-pages/for-you-sign-in';
import { useTrendingOnSignOut } from '@/blog/features/tags-pages/use-trending-on-sign-out';
import { FOR_YOU_SORT } from '@/blog/lib/utils';

const Content = () => {
  const { user, isHydrated } = useUserClient();
  const hasSignedOut = useTrendingOnSignOut(user.isLoggedIn, isHydrated);
  if (!isHydrated || hasSignedOut) return <PostListSkeleton count={5} />;
  if (!user.isLoggedIn) return <ForYouSignIn />;
  return <SortedPagesPosts sort={FOR_YOU_SORT} />;
};

export default Content;
