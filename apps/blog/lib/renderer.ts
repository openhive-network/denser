import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@ui/lib/old-profixy';
import env from '@beam-australia/react-env';
import imageUserBlocklist from '@hive/ui/config/lists/image-user-blocklist';
import { isUrlWhitelisted } from '@hive/ui/config/lists/phishing';

const renderDefaultOptions = {
  baseUrl: `${env('SITE_DOMAIN')}/`,
  breaks: true,
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
  imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
  usertagUrlFn: (account: string) => '/@' + account,
  hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
  isLinkSafeFn: (url: string) =>
    (!!url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) && !!url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`)) ||
    (!!url.match(`^(/(?!/)|#)`) && isUrlWhitelisted(url)),
  addExternalCssClassToMatchingLinksFn: (url: string) =>
    !url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) &&
    !url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`) &&
    !url.match(`^(/(?!/)|#)`) &&
    !isUrlWhitelisted(url)
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
