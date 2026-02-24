'use client';

import { usePathname } from 'next/navigation';
import { PostListSkeleton, Skeleton } from '@hive/ui';

function SidebarSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export default function Loading() {
  const pathname = usePathname();
  const segments = pathname?.split('/');
  // Routes like /trending/hive-xxx have a tag in the 3rd segment.
  // Main feeds (/trending, /hot) and /trending/my don't.
  const tag = segments?.[2];
  const isCommunityOrTag = tag && tag !== 'my';

  if (isCommunityOrTag) {
    // Community/tag route: the grid comes from CommunityLayout (async),
    // which hasn't loaded yet, so the skeleton must provide its own grid.
    return (
      <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
        <div className="grid grid-cols-12 md:gap-4">
          <div className="hidden md:col-span-3 md:flex xl:col-span-2">
            <SidebarSkeleton />
          </div>
          <div className="col-span-12 md:col-span-9 xl:col-span-8">
            <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
              <div className="my-4 flex w-full items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-9 w-[180px]" />
              </div>
              <PostListSkeleton count={5} />
            </div>
          </div>
          <div className="hidden xl:col-span-2 xl:flex">
            <SidebarSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Main feed route: MainPageLayout (sync client component) already
  // provides the container/grid, so the skeleton just needs the post list.
  return (
    <div className="flex flex-grow flex-col">
      <PostListSkeleton count={5} />
    </div>
  );
}
