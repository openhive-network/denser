import { Metadata } from 'next';
import { getQueryClient } from '@/blog/lib/react-query';
import { getCommunity } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export async function buildCommunityTagMetadata(
  params: { tag: string },
  sectionLabel?: string
): Promise<Metadata> {
  const tag = params.tag;

  if (!tag.startsWith('hive-')) return { title: `#${tag}${sectionLabel ? ` / ${sectionLabel}` : ''} - Hive` };

  const queryClient = getQueryClient();
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ['community', tag],
      queryFn: () => getCommunity(tag)
    });

    const communityName = data?.title ?? data?.name ?? tag;
    const titleSection = sectionLabel ? ` / ${sectionLabel}` : '';
    const title = `${communityName}${titleSection} - Hive`;
    const description = data?.description || `${tag} community. Hive: Communities Without Borders.`;
    const image = data?.avatar_url || 'https://hive.blog/images/hive-blog-share.png';

    return {
      title,
      description,
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
    openGraph: {
      title: `#${tag}${sectionLabel ? ` / ${sectionLabel}` : ''} - Hive`,
      description: `${tag} community. Hive: Communities Without Borders.`,
      images: ['https://hive.blog/images/hive-blog-share.png']
    }
  };
}
