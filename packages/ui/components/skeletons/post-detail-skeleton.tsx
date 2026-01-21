import { Skeleton } from './skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@ui/components/card';
import { Separator } from '@ui/components/separator';

// Card components used in CommentSkeletonItem

function PostDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12">
      <div className="col-span-2 hidden md:block" />
      <div className="w-full min-w-0 py-8 md:col-span-8 md:mx-auto md:flex md:flex-col">
        <article className="relative mx-auto my-0 w-full max-w-4xl bg-background p-4">
          <Skeleton className="mb-4 h-8 w-3/4" />
          <div className="flex items-center gap-2 py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>

          <div className="space-y-4 py-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="my-6 h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <Separator />

          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-5 w-16" />
            <Separator orientation="vertical" className="h-5" />
            <Skeleton className="h-5 w-12" />
            <Separator orientation="vertical" className="h-5" />
            <Skeleton className="h-5 w-20" />
          </div>
        </article>

        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 mt-4 flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-5 w-20" />
          </div>

          <Skeleton className="mb-4 h-4 w-32" />

          <div className="space-y-4">
            <CommentSkeletonItem />
            <CommentSkeletonItem />
            <CommentSkeletonItem />
          </div>
        </div>
      </div>
      <div className="col-span-2" />
    </div>
  );
}

function CommentSkeletonItem() {
  return (
    <div className="flex gap-3">
      <Skeleton className="hidden h-10 w-10 shrink-0 rounded-full sm:block" />
      <Card className="w-full bg-background">
        <CardHeader className="px-2 py-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full sm:hidden" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="px-2 py-3">
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
        <Separator />
        <CardFooter className="px-2 py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-12" />
            <Separator orientation="vertical" className="h-4" />
            <Skeleton className="h-4 w-14" />
            <Separator orientation="vertical" className="h-4" />
            <Skeleton className="h-4 w-10" />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export { PostDetailSkeleton, CommentSkeletonItem };
