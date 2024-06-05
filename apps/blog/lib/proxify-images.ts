import querystring from 'querystring';
import multihash from 'multihashes';
import env from '@beam-australia/react-env';

// Change this when we have images.hive.blog working
let proxyBase = `${env('IMAGES_ENDPOINT')}`;

export function setProxyBase(p: string): void {
  proxyBase = p;
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

export function proxifyImageSrc(url?: string, width = 0, height = 0, format = 'match') {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // skip images already proxified with images.hive.blog
  if (url.indexOf('https://images.hive.blog/') === 0 && url.indexOf('https://images.hive.blog/D') !== 0) {
    console.log(url.replace('https://images.hive.blog/', proxyBase));
    return url.replace('https://images.hive.blog/', proxyBase);
  }

  if (url.indexOf('https://steemitimages.com/') === 0 && url.indexOf('https://steemitimages.com/D') !== 0) {
    return url.replace('https://steemitimages.com', proxyBase);
  }

  if (url.indexOf('https://images.ecency.com/') === 0 && url.indexOf('https://images.ecency.com/D') !== 0) {
    return url.replace('https://images.ecency.com', proxyBase);
  }

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
    return `${proxyBase}/p/${pHash}${format === 'webp' ? '.webp' : '.png'}?${qs}`;
  }

  const b58url = multihash.toB58String(Buffer.from(realUrl.toString()));

  return `${proxyBase}/p/${b58url}${format === 'webp' ? '.webp' : '.png'}?${qs}`;
}
