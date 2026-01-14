import { configuredSiteDomain } from '@ui/config/public-vars';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = configuredSiteDomain.endsWith('/')
    ? configuredSiteDomain.slice(0, -1)
    : configuredSiteDomain;

  // Current date for lastModified - SEO best practice
  const now = new Date();

  // Static pages with lastModified for better SEO
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1, lastModified: now },
    { url: `${baseUrl}/trending`, changeFrequency: 'hourly', priority: 0.9, lastModified: now },
    { url: `${baseUrl}/hot`, changeFrequency: 'hourly', priority: 0.9, lastModified: now },
    { url: `${baseUrl}/created`, changeFrequency: 'hourly', priority: 0.9, lastModified: now },
    { url: `${baseUrl}/communities`, changeFrequency: 'daily', priority: 0.8, lastModified: now },
    { url: `${baseUrl}/faq.html`, changeFrequency: 'monthly', priority: 0.3, lastModified: now },
    { url: `${baseUrl}/privacy.html`, changeFrequency: 'monthly', priority: 0.3, lastModified: now },
    { url: `${baseUrl}/tos.html`, changeFrequency: 'monthly', priority: 0.3, lastModified: now }
  ];

  return staticPages;
}
