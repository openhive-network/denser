import env from '@beam-australia/react-env';
import { isUrlWhitelisted, looksPhishy } from '@hive/ui/config/lists/phishing';

const internalLinksRegex = `^(/(?!/)|#)`;
const siteDomain = env('SITE_DOMAIN');
const imagesEndpoint = env('IMAGES_ENDPOINT');

const youtubeEmbedRegex =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/watch\?v=|youtu.be\/[^watch]|youtube\.com\/(embed|shorts)\/)([A-Za-z0-9_-]+)[^ ]*/i;
const youtubeIdRegex =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/watch\?v=|youtu.be\/|youtube\.com\/(embed|shorts)\/)([A-Za-z0-9_-]+)/i;

export function getYoutubeaFromLink(
  data: string
): { id: string; url: string; thumbnail: string; isShorts: boolean } | undefined {
  if (!data) {
    return undefined;
  }

  const m1 = data.match(youtubeEmbedRegex);
  const url = m1 ? m1[0] : undefined;
  if (!url) {
    return undefined;
  }

  const m2 = url.match(youtubeIdRegex);
  const id = m2 && m2.length >= 2 ? m2[2] : undefined;
  if (!id) {
    return undefined;
  }
  const isShorts = url.includes('shorts');

  return {
    id,
    url,
    thumbnail: 'https://img.youtube.com/vi/' + id + '/0.jpg',
    isShorts
  };
}

export const checkLinks = (url: string) => {
  const internalLinks =
    !!url.match(internalLinksRegex) ||
    !!url.match(`^(/(?!/)|${siteDomain})`) ||
    !!url.match(`^(/(?!/)|${imagesEndpoint})`);
  const externalLinks = isUrlWhitelisted(url);
  const phishyLinks = looksPhishy(url);

  return internalLinks ? 'internal' : phishyLinks ? 'phishy' : externalLinks ? 'external' : 'not found';
};
