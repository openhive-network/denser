const MD_IMAGE_REGEX = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
const BARE_IMAGE_REGEX = /(?:^|\n)\s*(https?:\/\/[^\s]+\.(?:jpe?g|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)\s*(?:\n|$)/gi;
const HTML_IMG_REGEX = /<img\s[^>]*src=["'](https?:\/\/[^"']+)["']/gi;

/** External image URLs in markdown content: markdown images, bare image links and `<img>` tags. */
export function collectExternalImageUrls(content: string, proxyBase: string): string[] {
  const urls: string[] = [];
  for (const regex of [MD_IMAGE_REGEX, BARE_IMAGE_REGEX, HTML_IMG_REGEX]) {
    for (const match of content.matchAll(regex)) {
      if (!match[1].startsWith(proxyBase)) urls.push(match[1]);
    }
  }
  return urls;
}

/**
 * Whether the editor preview needs a proxy auth token. Without one the image proxy serves only
 * images of published content, so the token is needed only for an external image that the
 * published version of the post (`publishedImages`) does not already have.
 */
export function needsProxyAuth(content: string, proxyBase: string, publishedImages: ReadonlySet<string>): boolean {
  return collectExternalImageUrls(content, proxyBase).some((url) => !publishedImages.has(url));
}
