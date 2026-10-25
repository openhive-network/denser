import type { MetadataRoute } from 'next';
import { configuredSeoAllowIndexing } from '@hive/ui/config/public-vars';
import { getBasePath } from '@ui/lib/path-utils';
import { buildRobots } from '@/blog/lib/seo-robots';
import { SITE_URL } from '@/blog/lib/site-url';

// Read at request time: the setting and the site URL are runtime configuration, not build-time.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return buildRobots({
    allowIndexing: configuredSeoAllowIndexing,
    siteUrl: SITE_URL,
    basePath: getBasePath()
  });
}
