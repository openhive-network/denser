import type { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';

/**
 * The metadata of every 404 page. A layout that answers 404 returns it from its own generateMetadata
 * as well: Next puts app/not-found.tsx's metadata into the server HTML, but the client applies the
 * route's own metadata after hydration. The title template holds no `%s`, so a nested route's own
 * title (e.g. "Posts by alice") resolves to the not-found title too.
 */
export async function getPageNotFoundMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  const title = `${t('page_titles.page_not_found')} - Hive Blog`;
  return { title: { absolute: title, template: title } };
}
