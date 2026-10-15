import type { Metadata } from 'next';
import { Link } from '@ui/components/link';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';
import { getTranslation } from '@/blog/i18n/server';

export function generateMetadata(): Promise<Metadata> {
  return getPageNotFoundMetadata();
}

export default async function NotFound() {
  const { t } = await getTranslation('common_blog');
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center" data-testid="not-found-page">
      <h1 className="mb-4 text-6xl font-bold text-muted-foreground">404</h1>
      <h2 className="mb-4 text-2xl font-semibold">{t('four_oh_four.page_not_found')}</h2>
      <p className="mb-8 max-w-md text-muted-foreground">{t('four_oh_four.page_may_have_moved')}</p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
        >
          {t('four_oh_four.go_home')}
        </Link>
        <Link
          href="/trending"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {t('four_oh_four.browse_trending')}
        </Link>
      </div>
    </div>
  );
}
