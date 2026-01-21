import { Skeleton } from '@hive/ui';

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="flex w-full flex-col">
      {Array.from({ length: 10 }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
}
