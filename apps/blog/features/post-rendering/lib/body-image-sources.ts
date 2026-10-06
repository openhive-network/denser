import { proxifyImageSrc } from '@ui/lib/proxify-images';

// Resizing-proxy widths offered to the browser for post body images.
const BODY_IMAGE_WIDTHS = [640, 1024, 1536];
// The post body column: full width below md, 8 of 12 grid columns up to the 2xl container.
export const BODY_IMAGE_SIZES = '(min-width: 1536px) 1024px, (min-width: 768px) 67vw, 100vw';
// Resizing would drop GIF animation frames and rasterize SVGs.
const NOT_RESIZABLE_IMAGE = /\.(gif|svg)($|\?)/i;

/**
 * `srcset` of resized WebP candidates for a body image, or '' when the image must be served
 * as is: GIF/SVG, or a URL proxifyImageSrc returns unchanged whatever the width (already proxied).
 */
export function getBodyImageSrcSet(url: string, token?: string): string {
  if (NOT_RESIZABLE_IMAGE.test(url)) return '';
  const candidates = BODY_IMAGE_WIDTHS.map((width) => proxifyImageSrc(url, width, 0, 'webp', token));
  if (new Set(candidates).size !== candidates.length) return '';
  return candidates.map((candidate, i) => `${candidate} ${BODY_IMAGE_WIDTHS[i]}w`).join(', ');
}
