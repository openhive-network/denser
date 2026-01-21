import { PostListSkeleton } from '@hive/ui';

export default function Loading() {
  return (
    <div className="flex flex-grow flex-col">
      <PostListSkeleton count={5} />
    </div>
  );
}
