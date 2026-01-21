import { Skeleton } from '@hive/ui';

function CommunityRowSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-border py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-8 w-24 rounded-md" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col">
      <Skeleton className="mb-4 h-6 w-48" />
      {Array.from({ length: 8 }).map((_, i) => (
        <CommunityRowSkeleton key={i} />
      ))}
    </div>
  );
}
