// Path characters stop at whitespace, quotes, angle brackets and parentheses, so a bare URL
// followed by markup (`…png<br />`) or a markdown link's `)` ends at the extension.
const HIVE_BLOG_IMAGE_REGEX =
  /(?:https?:\/\/)?images\.hive\.blog\/[^\s"'<>()]+?\.(?:jpe?g|png|webp|gif)(?![a-z0-9])/i;

// `\s` before `src` keeps `data-src` and similar attributes from matching.
const IMG_TAG_SRC_REGEX = /<img\b[^>]*?\ssrc\s*=\s*(["'])(.*?)\1/i;

/** The images.hive.blog image URL inside `url`, or null when it holds none. */
export function matchHiveBlogImageUrl(url: string): string | null {
  return url.match(HIVE_BLOG_IMAGE_REGEX)?.[0] ?? null;
}

/** The `src` of the first `<img>` tag in `body`, single- or double-quoted, or null. */
export function findImgTagSrc(body: string): string | null {
  return body.match(IMG_TAG_SRC_REGEX)?.[2] || null;
}
