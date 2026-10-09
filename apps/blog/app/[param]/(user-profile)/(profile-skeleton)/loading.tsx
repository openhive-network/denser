import { PostListSkeleton } from '@ui/components/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-grow flex-col pt-4">
      <PostListSkeleton count={4} />
    </div>
  );
}
