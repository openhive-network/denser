import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { getCommunities } from '@transaction/lib/bridge-api';
import { getLogger } from '@ui/lib/logging';
import { buildSitemap } from '@/blog/lib/sitemap-entries';
import { SITE_URL } from '@/blog/lib/site-url';

const logger = getLogger('app');

const COMMUNITIES_REVALIDATE_SECONDS = 60 * 60;

// Built at request time: the site URL is runtime configuration and the community list is the chain's.
export const dynamic = 'force-dynamic';

const getTopCommunityNames = unstable_cache(
  async (): Promise<string[]> =>
    ((await getCommunities('rank', null)) ?? []).map((community) => community.name),
  ['sitemap-top-communities'],
  { revalidate: COMMUNITIES_REVALIDATE_SECONDS }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const communities = await getTopCommunityNames().catch((error: unknown) => {
    logger.error(error, 'Sitemap: listing the top communities failed, serving the sitemap without them');
    return [];
  });
  return buildSitemap(SITE_URL, communities);
}
