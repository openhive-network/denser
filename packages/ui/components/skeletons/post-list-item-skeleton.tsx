import { Skeleton } from './skeleton';
import { Card, CardFooter, CardHeader } from '@ui/components/card';
import { Separator } from '@ui/components/separator';

function PostListItemSkeleton() {
  return (
    <li>
      <Card className="mb-4 bg-background px-2 text-primary">
        <CardHeader className="px-0 py-1">
          <div className="flex items-center text-sm">
            <Skeleton className="mr-3 h-[24px] w-[24px] rounded-full" />
            <div className="flex flex-wrap items-center gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </CardHeader>
        <div className="flex w-full flex-col md:flex-row">
          <Skeleton className="mb-2 h-[105px] w-[150px] shrink-0 rounded md:mb-0 md:mr-4" />
          <div className="w-full md:overflow-hidden">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-1 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-5/6" />
            <CardFooter className="pb-2 pl-0">
              <div className="flex h-5 items-center space-x-2 text-sm">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-12" />
                <Separator orientation="vertical" />
                <Skeleton className="h-4 w-14" />
                <Separator orientation="vertical" />
                <Skeleton className="h-4 w-10" />
                <Separator orientation="vertical" />
                <Skeleton className="h-4 w-4" />
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>
    </li>
  );
}

function PostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul>
      {Array.from({ length: count }).map((_, i) => (
        <PostListItemSkeleton key={i} />
      ))}
    </ul>
  );
}

export { PostListItemSkeleton, PostListSkeleton };
