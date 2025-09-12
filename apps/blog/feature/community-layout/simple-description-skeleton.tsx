import { Skeleton } from '@ui/components/skeleton';

const SimpleDescriptionSkeleton = () => {
  return (
    <div className="grid w-full grid-cols-3 rounded-lg border border-border bg-background p-4">
      <div className="col-span-2 my-4 w-full space-y-4">
        <div className="flex items-center space-x-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex space-x-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="col-span-1 flex h-full flex-col items-center justify-center gap-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
};
export default SimpleDescriptionSkeleton;
