import { notFound } from 'next/navigation';
import { DEFAULT_OBSERVER, isForYouEnabled } from '@/blog/lib/utils';
import { getEffectiveObserverFromCookies, getObserverFromCookies } from '@/blog/lib/auth-utils';
import { getForYouFirstPage } from '@/blog/lib/for-you-first-page';
import {
  InitialHiddenAuthorsProvider,
  InitialPostsProvider,
  ObserverProvider
} from '@/blog/components/observer-provider';
import FirstCardImagePreload from '@/blog/features/list-of-posts/first-card-image-preload';
import { withoutHiddenAuthors } from '@transaction/lib/hidden-authors';
import Content from './content';

// FYP_API_URL is read when the server starts, so the route cannot be decided at build time
export const dynamic = 'force-dynamic';

const Page = async () => {
  if (!isForYouEnabled) notFound();
  // The observer cookie names the signed-in account: its first page is read here, so the list paints
  // with the document instead of after hydration and a browser read
  const viewer = await getObserverFromCookies();
  const observer = await getEffectiveObserverFromCookies();
  const firstPage = viewer === DEFAULT_OBSERVER ? null : await getForYouFirstPage(viewer, observer);
  const visiblePosts = firstPage && withoutHiddenAuthors(firstPage.posts, new Set(firstPage.hiddenAuthors));
  return (
    <ObserverProvider value={viewer} effectiveValue={observer}>
      <FirstCardImagePreload entries={visiblePosts} />
      <InitialPostsProvider value={firstPage?.posts ?? null}>
        <InitialHiddenAuthorsProvider value={firstPage?.hiddenAuthors ?? null}>
          <Content />
        </InitialHiddenAuthorsProvider>
      </InitialPostsProvider>
    </ObserverProvider>
  );
};

export default Page;
