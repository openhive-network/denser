import { Skeleton } from '@hive/ui';

function CommunityCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-4">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-2 flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2">
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
  return (
    <div className="container mx-auto max-w-screen-2xl flex-grow px-4 pb-2">
      <div className="grid grid-cols-12 md:gap-4">
        <div className="hidden md:col-span-3 md:flex xl:col-span-2">
          <SidebarSkeleton />
        </div>
        <div className="col-span-12 md:col-span-9 xl:col-span-8">
          <div className="col-span-12 mb-5 flex flex-col md:col-span-10 lg:col-span-8">
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="mt-4 flex w-full items-center justify-between gap-4">
              <Skeleton className="h-10 w-full max-w-md rounded-full" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="my-4 h-px w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <CommunityCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
        <div className="hidden xl:col-span-2 xl:flex">
          <SidebarSkeleton />
        </div>
      </div>
    </div>
  );
}
