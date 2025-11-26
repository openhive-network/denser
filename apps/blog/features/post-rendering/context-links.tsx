import { useTranslation } from '@/blog/i18n/client';
import { Entry } from '@transaction/lib/extended-hive.chain';
import Link from 'next/link';

const ContentLinks = ({ data, noContext }: { data: Entry; noContext: boolean }) => {
  const { t } = useTranslation('common_blog');

  return (
    <div className="flex flex-col gap-2 border-2 border-solid border-card-emptyBorder bg-card-noContent p-2">
      <h4 className="text-sm">
        {t('post_content.if_comment.you_are_viewing_a_single_comments_thread_from')}:
      </h4>
      <h1 data-testid="article-title" className="text-2xl">
        {data.title}
      </h1>
      <Link
        className="text-sm hover:text-destructive"
        href={`${data.url}`}
        data-testid="view-the-full-context"
      >
        • {t('post_content.if_comment.view_the_full_context')}
      </Link>
      {noContext ? (
        <Link
          className="text-sm hover:text-destructive"
          href={`/${data.category}/@${data.parent_author}/${data.parent_permlink}`}
          data-testid="view-the-direct-parent"
        >
          • {t('post_content.if_comment.view_the_direct_parent')}
        </Link>
      ) : null}
    </div>
  );
};

export default ContentLinks;
