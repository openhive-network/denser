import { DefaultRenderer } from '@hive/renderer';
import { proxifyImageSrc } from '@ui/lib/proxify-images';
import { BODY_IMAGE_SIZES, getBodyImageSrcSet } from './body-image-sources';
import { RENDERER_PLUGINS } from './renderer-plugins';

import imageUserBlocklist from '@hive/ui/config/lists/image-user-blocklist';

import { configuredSiteDomain, configuredImagesEndpoint } from '@hive/ui/config/public-vars';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Build a set of trusted origins for link safety checks.
// Uses URL.origin comparison instead of string prefix matching to prevent
// subdomain spoofing (e.g. "images.hive.blog.evil.com" matching "images.hive.blog").
const safeOrigins = new Set(
  [configuredImagesEndpoint, configuredSiteDomain]
    .filter(Boolean)
    .map((domain) => {
      try {
        return new URL(domain).origin;
      } catch {
        return null;
      }
    })
    .filter((o): o is string => o !== null)
);

function isLinkSafe(url: string): boolean {
  if (url.startsWith('#')) return true;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    return safeOrigins.has(new URL(url).origin);
  } catch {
    return false;
  }
}

const renderDefaultOptions = {
  baseUrl: configuredSiteDomain,
  breaks: false,
  skipSanitization: false,
  allowInsecureScriptTags: false,
  addNofollowToLinks: true,
  addTargetBlankToLinks: true,
  cssClassForInternalLinks: '',
  cssClassForExternalLinks: 'link-external',
  doNotShowImages: false,
  ipfsPrefix: '',
  assetsWidth: 640,
  assetsHeight: 480,
  plugins: [...RENDERER_PLUGINS],
  imageProxyFn: (url: string) => proxifyImageSrc(url, 1536, 0),
  imageSrcSetFn: (url: string) => getBodyImageSrcSet(url),
  imageSizes: BODY_IMAGE_SIZES,
  usertagUrlFn: (account: string) => (basePath ? `${basePath}/@${account}` : `/@${account}`),
  hashtagUrlFn: (hashtag: string) => (basePath ? `${basePath}/trending/${hashtag}` : `/trending/${hashtag}`),
  isLinkSafeFn: (url: string) => isLinkSafe(url),
  addExternalCssClassToMatchingLinksFn: (url: string) => !isLinkSafe(url)
};

const rendererRegular = new DefaultRenderer(renderDefaultOptions);

const rendererMainPost = new DefaultRenderer({
  ...renderDefaultOptions,
  prioritizeFirstImage: true
});

const rendererNoImages = new DefaultRenderer({
  ...renderDefaultOptions,
  doNotShowImages: true
});

/**
 * @param mainPost - the page's main post: its first body image is the LCP candidate,
 *   so it loads eagerly at high priority instead of lazily
 */
export function getRenderer(author: string = '', mainPost = false): DefaultRenderer {
  if (!!author && imageUserBlocklist.includes(author)) {
    return rendererNoImages;
  }
  return mainPost ? rendererMainPost : rendererRegular;
}

/**
 * Returns a renderer with a proxy auth token baked into imageProxyFn,
 * so editor preview images bypass the whitelist check.
 */
export function getPreviewRenderer(token: string, author: string = ''): DefaultRenderer {
  const options = {
    ...renderDefaultOptions,
    imageProxyFn: (url: string) => proxifyImageSrc(url, 1536, 0, 'match', token),
    imageSrcSetFn: (url: string) => getBodyImageSrcSet(url, token),
  };
  if (!!author && imageUserBlocklist.includes(author)) {
    return new DefaultRenderer({ ...options, doNotShowImages: true });
  }
  return new DefaultRenderer(options);
}
