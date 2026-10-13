import type { Metadata } from 'next';

const PAGE_NOT_FOUND_TITLE = 'Page not found - Hive Blog';

/**
 * The metadata of every 404 page. A layout that answers 404 returns it from its own generateMetadata
 * as well: Next puts app/not-found.tsx's metadata into the server HTML, but the client applies the
 * route's own metadata after hydration. The title template holds no `%s`, so a nested route's own
 * title (e.g. "Posts by alice") resolves to the not-found title too.
 */
export const PAGE_NOT_FOUND_METADATA: Metadata = {
  title: { absolute: PAGE_NOT_FOUND_TITLE, template: PAGE_NOT_FOUND_TITLE }
};
