import { Entry } from '@hive/common-hiveio-packages/wax';
import { findFirstVisibleCardImage } from './lib/card-image';

/**
 * Preload hint for the first visible feed card image, rendered by the server component
 * that fetched the first feed page so the browser requests it before the feed markup.
 *
 * Rendered as an element rather than via `ReactDOM.preload`: a hint issued after the
 * awaited feed fetch only reaches the RSC payload, never the server HTML. It must match
 * the card's `<img srcSet>` exactly (no `sizes`), or the browser downloads the image twice.
 */
export default function FirstCardImagePreload({ entries }: { entries: Entry[] | null }) {
  const image = entries ? findFirstVisibleCardImage(entries) : '';
  if (!image) return null;
  return <link rel="preload" as="image" imageSrcSet={image} fetchPriority="high" />;
}
