import querystring from 'querystring';
import multihash from 'multihashes';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

const proxyBase = configuredImagesEndpoint;

export function extractPHash(url: string): string | null {
  if (url.startsWith(`${proxyBase}/p/`)) {
    const [hash] = url.split('/p/')[1].split('?');
    return hash.replace(/.webp/, '').replace(/.png/, '');
  }
  return null;
}

export function getLatestUrl(str: string): string {
  const [last] = [
    ...str
      .replace(/https?:\/\//g, '\n$&')
      .trim()
      .split('\n')
  ].reverse();
  return last;
}

export function proxifyImageSrc(url?: string, width = 0, height = 0, format = 'match') {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Skip already-proxified URLs (ones that already have /p/ hash format)
  if (url.includes('/p/') && url.includes('images.hive.blog')) {
    return url; // Return as-is, already proxified
  }

  if (url.indexOf('https://steemitimages.com/') === 0 && url.indexOf('https://steemitimages.com/D') !== 0) {
    return url.replace('https://steemitimages.com', proxyBase);
  }

  if (url.indexOf('https://images.ecency.com/') === 0 && url.indexOf('https://images.ecency.com/D') !== 0) {
    return url.replace('https://images.ecency.com', proxyBase);
  }

  // For other external images, use the complex /p/hash system
  const realUrl = getLatestUrl(url);
  const pHash = extractPHash(realUrl);

  const options: Record<string, string | number> = {
    format,
    mode: 'fit'
  };

  if (width > 0) {
    options.width = width;
  }

  if (height > 0) {
    options.height = height;
  }

  const qs = querystring.stringify(options);

  if (pHash) {
    // Don't add .png extension for Hive images, let the image hoster decide
    return `${proxyBase}/p/${pHash}?${qs}`;
  }

  const b58url = multihash.toB58String(Buffer.from(realUrl.toString()) as unknown as Uint8Array);

  return `${proxyBase}/p/${b58url}?${qs}`;
}
