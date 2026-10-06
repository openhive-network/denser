import { proxifyImageSrc } from '@ui/lib/proxify-images';

// Video facades carry their thumbnail URL in data-thumb; the client inserts the <img>.
const FACADE_THUMB = /\sdata-thumb="([^"]+)"/;
const FIRST_IMAGE_TAG = /<img\s/;
const PRIORITY_HINTS = ' loading="eager" fetchpriority="high"';

export interface PrioritizedBody {
  html: string;
  /** Unproxied thumbnail URL of the video facade that precedes every body image */
  leadingVideoThumbnail?: string;
}

/** Proxied URL a video facade's thumbnail is loaded from. */
export function getFacadeThumbnailSrc(thumb: string, proxyAuthToken?: string): string {
  return proxifyImageSrc(thumb, 1536, 0, 'match', proxyAuthToken);
}

/**
 * When a video facade comes before any body image, its thumbnail is the page's LCP candidate:
 * the renderer's high-priority first image is demoted to lazy, and the thumbnail URL returned
 * so the caller can preload it and load it eagerly.
 */
export function prioritizeLeadingVideoThumbnail(html: string): PrioritizedBody {
  const thumb = FACADE_THUMB.exec(html);
  if (!thumb) return { html };
  const firstImageIndex = html.search(FIRST_IMAGE_TAG);
  if (firstImageIndex !== -1 && firstImageIndex < thumb.index) return { html };
  return {
    html: html.replace(PRIORITY_HINTS, ' loading="lazy"'),
    leadingVideoThumbnail: thumb[1].replace(/&amp;/g, '&')
  };
}
