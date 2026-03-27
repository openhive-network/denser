import querystring from 'querystring';
import multihash from 'multihashes';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

const proxyBase = configuredImagesEndpoint;

interface ProxyOptions {
  [key: string]: string | number | undefined;
  format: string;
  mode: string;
  width?: number;
  height?: number;
}

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

export function proxifyImageSrc(url?: string, width = 0, height = 0, format = 'match', token?: string) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Skip already-proxified URLs (ones that already have /p/ hash format)
  if (url.startsWith(`${proxyBase}/p/`)) {
    return url; // Return as-is, already proxified
  }

  if (url.indexOf('https://steemitimages.com/') === 0 && url.indexOf('https://steemitimages.com/D') !== 0) {
    let result = url.replace('https://steemitimages.com', proxyBase);
    if (token) {
      result += (result.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
    }
    return result;
  }

  // For other external images (including ecency), use the /p/hash system
  // Note: ecency's /p/ hash format is incompatible with hive.blog's, so we
  // must encode the full URL rather than doing a simple domain replacement
  const realUrl = getLatestUrl(url);
  // Handle spaces in malformed URLs (blockchain URLs are already percent-encoded;
  // encodeURI() was double-encoding %XX sequences, breaking URLs with %2F etc.)
  const encodedUrl = realUrl.replace(/ /g, '%20');
  const pHash = extractPHash(encodedUrl);

  // Detect GIF URLs - skip resizing to preserve animation frames
  // Resizing GIFs strips animation frames to reduce file size
  const isGif = /\.gif($|\?)/i.test(realUrl);

  const options: ProxyOptions = {
    format,
    mode: 'fit'
  };

  // Only add width/height for non-GIF images to preserve animation
  if (!isGif && width > 0) {
    options.width = width;
  }

  if (!isGif && height > 0) {
    options.height = height;
  }

  const qs = querystring.stringify(options);
  const tokenSuffix = token ? '&token=' + encodeURIComponent(token) : '';

  if (pHash) {
    // Don't add .png extension for Hive images, let the image hoster decide
    return `${proxyBase}/p/${pHash}?${qs}${tokenSuffix}`;
  }

  // Use TextEncoder for browser compatibility instead of Buffer
  const encoder = new TextEncoder();
  const bytes = encoder.encode(encodedUrl);
  const b58url = multihash.toB58String(bytes);

  return `${proxyBase}/p/${b58url}?${qs}${tokenSuffix}`;
}
