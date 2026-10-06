const PRIORITY_IMAGE_TAG = /<img\s[^>]*\bfetchpriority="high"[^>]*>/;

function readAttribute(tag: string, name: string): string | undefined {
  const value = tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  return value
    ?.replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Preload hint for the rendered body's high-priority (first) image, the post page's LCP
 * candidate. React hoists the `<link>` ahead of the post markup in the server HTML.
 *
 * It carries the image's own `src`/`srcset`/`sizes`, so the browser picks the same candidate
 * for both and downloads the image once. When a video facade comes before every body image,
 * the high-priority image is the facade's thumbnail.
 */
export default function FirstBodyImagePreload({ html }: { html: string }) {
  const tag = html.match(PRIORITY_IMAGE_TAG)?.[0];
  if (!tag) return null;
  const src = readAttribute(tag, 'src');
  const srcSet = readAttribute(tag, 'srcset');
  if (!src) return null;
  return (
    <link
      rel="preload"
      as="image"
      href={src}
      imageSrcSet={srcSet}
      imageSizes={srcSet ? readAttribute(tag, 'sizes') : undefined}
      fetchPriority="high"
    />
  );
}
