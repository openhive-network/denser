import { Skeleton } from './skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@ui/components/card';
import { Separator } from '@ui/components/separator';

function CommentSkeleton({ depth = 0 }: { depth?: number }) {
  const marginLeft = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : '';

  return (
    <li className={`w-full ${marginLeft}`}>
      <div className="flex w-full gap-3">
        <Skeleton className="hidden h-10 w-10 shrink-0 rounded-full sm:block" />
        <Card className="mb-4 w-full bg-background">
          <CardHeader className="px-2 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Skeleton className="h-5 w-5 rounded-full sm:hidden" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="px-2 py-3">
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
          <Separator />
          <CardFooter className="px-2 py-2">
            <div className="flex items-center gap-3 text-sm">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-12" />
              <Separator orientation="vertical" className="h-4" />
              <Skeleton className="h-4 w-14" />
              <Separator orientation="vertical" className="h-4" />
              <Skeleton className="h-4 w-10" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </li>
  );
}

function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </ul>
  );
}

export { CommentSkeleton, CommentListSkeleton };
