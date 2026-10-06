import { proxifyImageSrc } from '@ui/lib/proxify-images';

// Resizing-proxy widths offered to the browser for post body images. 480/768 let phones
// (~320-420 CSS px at DPR 1.5-2) take a candidate close to their content width.
const BODY_IMAGE_WIDTHS = [480, 640, 768, 1024, 1536];
// The post body column: the viewport below md, 8 of 12 grid columns from md, minus the post
// card's 42 px of padding and border either way, until the card's max-w-4xl caps it at 854 px.
export const BODY_IMAGE_SIZES = '(min-width: 1344px) 854px, (min-width: 768px) calc(66.67vw - 42px), calc(100vw - 42px)';
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
