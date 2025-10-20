import { DefaultRenderer, InstagramPlugin, TablePlugin, TwitterPlugin } from '@hive/renderer';
import { getDoubleSize, proxifyImageUrl } from '@ui/lib/old-profixy';

import imageUserBlocklist from '@hive/ui/config/lists/image-user-blocklist';

import { configuredSiteDomain, configuredImagesEndpoint } from '@hive/ui/config/public-vars';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const renderDefaultOptions = {
  baseUrl: `${configuredSiteDomain}/`,
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
  plugins: [new TwitterPlugin(), new InstagramPlugin(), new TablePlugin()],
  imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
  usertagUrlFn: (account: string) => (basePath ? `${basePath}/@${account}` : `/@${account}`),
  hashtagUrlFn: (hashtag: string) => (basePath ? `${basePath}/trending/${hashtag}` : `/trending/${hashtag}`),
  isLinkSafeFn: (url: string) =>
    !!url.match(`^(/(?!/)|${configuredImagesEndpoint})`) ||
    !!url.match(`^(/(?!/)|${configuredSiteDomain})`) ||
    !!url.match(`^(/(?!/)|#)`),

  addExternalCssClassToMatchingLinksFn: (url: string) =>
    !url.match(`^(/(?!/)|${configuredImagesEndpoint})`) &&
    !url.match(`^(/(?!/)|${configuredSiteDomain})`) &&
    !url.match(`^(/(?!/)|#)`)
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
