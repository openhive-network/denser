import { DefaultRenderer, TablePlugin, InstagramResizePlugin, TwitterResizePlugin } from '@hive/renderer';
import { proxifyImageSrc } from '@ui/lib/proxify-images';

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
  // Note: Instagram uses iframe-only resize (postMessage), Twitter loads widgets.js for native rendering
  plugins: [new TablePlugin(), new InstagramResizePlugin(), new TwitterResizePlugin()],
  imageProxyFn: (url: string) => proxifyImageSrc(url, 1536, 0),
  usertagUrlFn: (account: string) => (basePath ? `${basePath}/@${account}` : `/@${account}`),
  hashtagUrlFn: (hashtag: string) => (basePath ? `${basePath}/trending/${hashtag}` : `/trending/${hashtag}`),
  isLinkSafeFn: (url: string) => isLinkSafe(url),
  addExternalCssClassToMatchingLinksFn: (url: string) => !isLinkSafe(url)
};

const rendererRegular = new DefaultRenderer(renderDefaultOptions);

const rendererNoImages = new DefaultRenderer({
  ...renderDefaultOptions,
  doNotShowImages: true
});

export function getRenderer(author: string = ''): DefaultRenderer {
  if (!!author && imageUserBlocklist.includes(author)) {
    return rendererNoImages;
  } else {
    return rendererRegular;
  }
}

/**
 * Returns a renderer with a proxy auth token baked into imageProxyFn,
 * so editor preview images bypass the whitelist check.
 */
export function getPreviewRenderer(token: string, author: string = ''): DefaultRenderer {
  const options = {
    ...renderDefaultOptions,
    imageProxyFn: (url: string) => proxifyImageSrc(url, 1536, 0, 'match', token),
  };
  if (!!author && imageUserBlocklist.includes(author)) {
    return new DefaultRenderer({ ...options, doNotShowImages: true });
  }
  return new DefaultRenderer(options);
}
