/* eslint-disable security/detect-non-literal-regexp */
/**
 * Based on: https://raw.githubusercontent.com/openhive-network/condenser/master/src/app/utils/Links.js
 */
const urlChar = '[^\\s"<>\\]\\[\\(\\)]';
const urlCharEnd = urlChar.replace(/\]$/, ".,']"); // insert bad chars to end on
const imagePath = '(?:(?:\\.(?:tiff?|jpe?g|gif|png|svg|ico)|ipfs/[a-z\\d]{40,}))';
const domainPath = '(?:[-a-zA-Z0-9\\._]*[-a-zA-Z0-9])';
const urlChars = '(?:' + urlChar + '*' + urlCharEnd + ')?';

const urlSet = ({domain = domainPath, path = ''} = {}) => {
    // urlChars is everything but html or markdown stop chars
    return `https?://${domain}(?::\\d{2,5})?(?:[/\\?#]${urlChars}${path ? path : ''})${path ? '' : '?'}`;
};

/**
 * Unless your using a 'g' (glob) flag you can store and re-use your regular expression.  Use the cache below.
 *  If your using a glob (for example: replace all), the regex object becomes stateful and continues where it
 *   left off when called with the
 *   same string so naturally the regex object can't be cached for long.
 */
export const any = (flags = 'i') => new RegExp(urlSet(), flags);
// TODO verify if we should pass baseUrl here
export const local = (flags = 'i') => new RegExp(urlSet({domain: '(?:localhost|(?:.*\\.)?hive.blog)'}), flags);
export const remote = (flags = 'i') => new RegExp(urlSet({domain: `(?!localhost|(?:.*\\.)?hive.blog)${domainPath}`}), flags);
export const image = (flags = 'i') => new RegExp(urlSet({path: imagePath}), flags);
export const imageFile = (flags = 'i') => new RegExp(imagePath, flags);

export default {
    any: any(),
    local: local(),
    remote: remote(),
    image: image(),
    imageFile: imageFile(),
    vimeo: /https?:\/\/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)\/?(#t=((\d+)s?))?\/?/,
    vimeoId: /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/,
    twitch: /https?:\/\/(?:www.)?twitch\.tv\/(?:(videos)\/)?([a-zA-Z0-9][\w]{3,24})/i,
    ipfsProtocol: /^((\/\/?ipfs\/)|(ipfs:\/\/))/
};
