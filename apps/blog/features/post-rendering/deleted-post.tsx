import { Link } from '@ui/components/link';
import { getTranslation } from '@/blog/i18n/server';

/** What the page of a post or comment its author deleted shows in place of the post. */
export default async function DeletedPost({ author }: { author: string }) {
  const { t } = await getTranslation('common_blog');
  return (
    <div
      className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center"
      data-testid="deleted-post-page"
    >
      <h1 className="mb-4 text-2xl font-semibold">{t('deleted_post.title')}</h1>
      <p className="mb-8 max-w-md text-muted-foreground">{t('deleted_post.description', { author })}</p>
      <Link
        href={`/@${author}`}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
        data-testid="deleted-post-author-link"
      >
        {t('deleted_post.author_profile')}
      </Link>
    </div>
  );
}
