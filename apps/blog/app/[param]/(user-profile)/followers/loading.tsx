import { Skeleton } from '@hive/ui';

function FollowerRowSkeleton() {
  return (
    <div className="flex items-center justify-between bg-background-tertiary px-3 py-2 odd:bg-background">
      <Skeleton className="h-5 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-2 p-2">
      <Skeleton className="h-6 w-48 self-center" />
      <div className="flex justify-center gap-2 py-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="flex flex-col">
        {Array.from({ length: 15 }).map((_, i) => (
          <FollowerRowSkeleton key={i} />
        ))}
      </div>
      <div className="flex justify-center gap-2 py-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}
