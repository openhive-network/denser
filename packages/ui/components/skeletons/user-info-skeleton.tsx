import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from '@ui/components/card';

function UserInfoSkeleton() {
  return (
    <div className="flex flex-col py-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-2" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-2" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function UserProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Skeleton className="h-32 w-full rounded-t-lg sm:h-48" />
        <div className="absolute -bottom-12 left-4 sm:-bottom-16 sm:left-6">
          <Skeleton className="h-24 w-24 rounded-full border-4 border-background sm:h-32 sm:w-32" />
        </div>
      </div>

      <div className="mt-14 px-4 sm:mt-20 sm:px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-1">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <Skeleton className="mt-4 h-16 w-full" />

        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function UserCardSkeleton() {
  return (
    <Card className="bg-background">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-3 flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="ml-auto h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export { UserInfoSkeleton, UserProfileSkeleton, UserCardSkeleton, UserListSkeleton };
