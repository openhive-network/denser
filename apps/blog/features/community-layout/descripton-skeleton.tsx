import { Skeleton } from '@ui/components/skeleton';

const DescriptionSkeleton = () => {
  return (
    <div className="flex flex-col">
      <div className="my-4 flex h-fit w-full max-w-[240px] flex-col rounded-lg bg-background px-4 py-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-12">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-4 w-24" />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>

        <Skeleton className="mt-8 h-4 w-1/2" />
        <Skeleton className="mt-2 h-4 w-1/2 self-end" />
        <div className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="mt-8 h-4 w-1/2 self-end" />
      </div>
      <div className="my-4 flex h-fit w-full max-w-[240px] flex-col rounded-lg bg-background px-4 py-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-5" />
        </div>
      </div>
    </div>
  );
};
export default DescriptionSkeleton;
