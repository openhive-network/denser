import { proxifyImageSrc } from '@ui/lib/proxify-images';

// Match condenser's 256x512 to share image cache at images.hive.blog
const UX_IMAGE_WIDTH = 256;
const UX_IMAGE_HEIGHT = 512;
// WebP would rasterize an SVG.
const SVG_IMAGE = /\.svg($|[?#\s])/i;
const PROXY_PATH_HASH = /\/p\/([1-9A-HJ-NP-Za-km-z]+)/;
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    let carry = BASE58_ALPHABET.indexOf(char);
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of text) {
    if (char !== '1') break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

/** The original URL an image proxy `/p/<base58 URL>` path stands for, or '' when the URL has none. */
function proxiedOriginalUrl(url: string): string {
  const hash = url.match(PROXY_PATH_HASH)?.[1];
  return hash ? new TextDecoder().decode(decodeBase58(hash)) : '';
}

/**
 * The image-proxy URL of a post card thumbnail: WebP at card size (a GIF source's first frame,
 * as a still), except an SVG source, kept in its format. A source behind another proxy's `/p/`
 * URL is judged by the original it encodes; a URL already proxied by the configured image proxy
 * is returned as is.
 */
export function proxifyCardImage(url?: string): string {
  if (!url) return '';
  const sources = [url, proxiedOriginalUrl(url)];
  const format = sources.some((source) => SVG_IMAGE.test(source)) ? 'match' : 'webp';
  return proxifyImageSrc(url, UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT, format);
}
