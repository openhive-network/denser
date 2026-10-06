import { proxifyImageSrc } from '@ui/lib/proxify-images';
import { BODY_IMAGE_SIZES, getBodyImageSrcSet } from './body-image-sources';

// Video facades carry their unproxied thumbnail URL in data-thumb (see the renderer's embedders).
const FACADE_OPENING_TAG = /<div class="[^"]*\bembed-facade\b[^"]*"[^>]*\sdata-thumb="([^"]+)"[^>]*>/;
const FACADE_OPENING_TAGS = new RegExp(FACADE_OPENING_TAG.source, 'g');
const FIRST_IMAGE_TAG = /<img\s/;
const PRIORITY_HINTS = ' loading="eager" fetchpriority="high"';

const decodeAttribute = (value: string) => value.replace(/&amp;/g, '&');
const encodeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function buildThumbnailTag(thumb: string, leading: boolean, proxyAuthToken?: string): string {
  const attributes = [`src="${encodeAttribute(proxifyImageSrc(thumb, 1536, 0, 'match', proxyAuthToken))}"`];
  const srcset = getBodyImageSrcSet(thumb, proxyAuthToken);
  if (srcset) attributes.push(`srcset="${encodeAttribute(srcset)}"`, `sizes="${BODY_IMAGE_SIZES}"`);
  attributes.push('alt=""', leading ? PRIORITY_HINTS.trim() : 'loading="lazy"');
  return `<img ${attributes.join(' ')}>`;
}

/**
 * Puts each video facade's thumbnail `<img>` into the rendered HTML, loaded through the image
 * proxy so even the preview image is no direct third-party request (issue #934).
 *
 * With `prioritizeLeading`, a facade that comes before every body image is the page's LCP
 * candidate: its thumbnail takes the high-priority hints from the renderer's first image, which
 * is demoted to lazy. Every other thumbnail is lazy-loaded.
 */
export function insertFacadeThumbnails(
  html: string,
  { prioritizeLeading, proxyAuthToken }: { prioritizeLeading: boolean; proxyAuthToken?: string }
): string {
  const firstFacade = FACADE_OPENING_TAG.exec(html);
  if (!firstFacade) return html;
  const firstImageIndex = html.search(FIRST_IMAGE_TAG);
  let leadingPending = prioritizeLeading && (firstImageIndex === -1 || firstFacade.index < firstImageIndex);
  const prioritizedHtml = leadingPending ? html.replace(PRIORITY_HINTS, ' loading="lazy"') : html;
  return prioritizedHtml.replace(FACADE_OPENING_TAGS, (tag: string, thumb: string) => {
    const thumbnail = buildThumbnailTag(decodeAttribute(thumb), leadingPending, proxyAuthToken);
    leadingPending = false;
    return tag + thumbnail;
  });
}
