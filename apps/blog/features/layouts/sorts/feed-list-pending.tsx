'use client';

import { ReactNode } from 'react';
import { PostListSkeleton } from '@hive/ui';
import { useFeedNavigation } from './feed-navigation-context';

const PENDING_SKELETON_COUNT = 5;

/** Shows the post-list skeleton in place of the feed while a feed navigation is pending. */
const FeedListPending = ({ children }: { children: ReactNode }) => {
  const feedNavigation = useFeedNavigation();

  if (!feedNavigation?.isPending) return <>{children}</>;
  return (
    <div data-testid="feed-navigation-pending" aria-busy="true">
      <PostListSkeleton count={PENDING_SKELETON_COUNT} />
    </div>
  );
};

export default FeedListPending;
