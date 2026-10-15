import { Metadata } from 'next';
import { getCommunity } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';
import { isCommunity } from '@ui/lib/utils';
import { getTranslation } from '@/blog/i18n/server';

const logger = getLogger('app');

const SECTION_TITLE_KEYS: Record<string, string> = {
  trending: 'page_titles.sections.trending',
  hot: 'page_titles.sections.hot',
  created: 'page_titles.sections.created',
  muted: 'page_titles.sections.muted',
  pending: 'page_titles.sections.pending',
  roles: 'page_titles.sections.roles'
};

export async function buildCommunityTagMetadata(
  params: { tag: string },
  sort: string,
  section: string = sort
): Promise<Metadata> {
  const tag = params.tag;
  const { t } = await getTranslation('common_blog');
  const sectionKey = SECTION_TITLE_KEYS[section];
  const sectionLabel = sectionKey ? t(sectionKey) : section;
  const alternates = { canonical: `/${sort}/${tag}` };

  if (!isCommunity(tag)) return { title: `#${tag}${sectionLabel ? ` / ${sectionLabel}` : ''} - Hive`, alternates };

  try {
    const data = await getCommunity(tag);

    const communityName = data?.title ?? data?.name ?? tag;
    const titleSection = sectionLabel ? ` / ${sectionLabel}` : '';
    const title = `${communityName}${titleSection} - Hive`;
    const description = data?.description || `${tag} community. Hive: Communities Without Borders.`;
    const image = data?.avatar_url || 'https://hive.blog/images/hive-blog-share.png';

    return {
      title,
      description,
      alternates,
      openGraph: {
        title,
        description,
        images: [image]
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image]
      }
    };
  } catch (error) {
    logger.error(error, 'Error in buildCommunityTagMetadata:');
  }
  return {
    title: `#${tag}${sectionLabel ? ` / ${sectionLabel}` : ''} - Hive`,
    description: `${tag} community. Hive: Communities Without Borders.`,
    alternates,
    openGraph: {
      title: `#${tag}${sectionLabel ? ` / ${sectionLabel}` : ''} - Hive`,
      description: `${tag} community. Hive: Communities Without Borders.`,
      images: ['https://hive.blog/images/hive-blog-share.png']
    }
  };
}
