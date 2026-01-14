import { configuredSiteDomain } from '@ui/config/public-vars';
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = configuredSiteDomain.endsWith('/')
    ? configuredSiteDomain.slice(0, -1)
    : configuredSiteDomain;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/_next/', '/healthchecker/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
