import env from '@beam-australia/react-env';
import { isUrlWhitelisted, looksPhishy } from '@hive/ui/config/lists/phishing';

const internalLinksRegex = `^(/(?!/)|#)`;
const siteDomain = env('SITE_DOMAIN');
const imagesEndpoint = env('IMAGES_ENDPOINT');

export const checkLinks = (url: string) => {
  const internalLinks =
    !!url.match(internalLinksRegex) ||
    !!url.match(`^(/(?!/)|${siteDomain})`) ||
    !!url.match(`^(/(?!/)|${imagesEndpoint})`);
  const externalLinks = isUrlWhitelisted(url);
  const phishyLinks = looksPhishy(url);

  return internalLinks ? 'internal' : phishyLinks ? 'phishy' : externalLinks ? 'external' : 'not found';
};
