import type { Metadata } from 'next';
import NotFound from '@/blog/app/not-found';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';
import { DeletedPostOrNotFound } from '@/blog/features/post-rendering/deleted-post-context';

export function generateMetadata(): Promise<Metadata> {
  return getPageNotFoundMetadata();
}

// The page's notFound() lands here, inside the layout, which knows whether the post was deleted.
export default function PostNotFound() {
  return <DeletedPostOrNotFound notFound={<NotFound />} />;
}
