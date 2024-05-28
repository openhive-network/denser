import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@ui/lib/old-profixy';
import env from '@beam-australia/react-env';
import imageUserBlocklist from '@hive/ui/config/lists/image-user-blocklist';

const rendererRegular = new DefaultRenderer({
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
        (!!url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) &&
            !!url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`)) ||
        !!url.match(`^(/(?!/)|#)`),
    addExternalCssClassToMatchingLinksFn: (url: string) =>
        !url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) &&
        !url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`) &&
        !url.match(`^(/(?!/)|#)`)
});

const rendererNoImages = new DefaultRenderer({
    baseUrl: `${env('SITE_DOMAIN')}/`,
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    addTargetBlankToLinks: true,
    cssClassForInternalLinks: '',
    cssClassForExternalLinks: 'link-external',
    doNotShowImages: true,
    ipfsPrefix: '',
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) =>
        (!!url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) &&
            !!url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`)) ||
        !!url.match(`^(/(?!/)|#)`),
    addExternalCssClassToMatchingLinksFn: (url: string) =>
        !url.match(`^(/(?!/)|${env('IMAGES_ENDPOINT')})`) &&
        !url.match(`^(/(?!/)|${env('SITE_DOMAIN')})`) &&
        !url.match(`^(/(?!/)|#)`)
});

export function getRenderer(
    author: string,
    doNotShowImages: boolean
): DefaultRenderer {
    if (doNotShowImages || imageUserBlocklist.includes(author)) {
        console.log('Returning rendererNoImages')
        return rendererNoImages;
    } else {
        console.log('Returning rendererRegular')
        return rendererRegular;
    }
}