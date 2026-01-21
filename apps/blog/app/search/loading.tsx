import { Skeleton, PostListSkeleton } from '@hive/ui';

export default function Loading() {
  return (
    <div className="m-auto flex max-w-4xl flex-col gap-12 px-4 py-8">
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
      <PostListSkeleton count={5} />
    </div>
  );
}
