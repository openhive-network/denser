import { Metadata } from 'next';
import { getQueryClient } from '@/blog/lib/react-query';
import { getCommunity } from '@transaction/lib/bridge-api';

export async function buildCommunityTagMetadata(
  params: { tag: string },
  sectionLabel?: string
): Promise<Metadata> {
  const queryClient = getQueryClient();
  const tag = params.tag;

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
}
