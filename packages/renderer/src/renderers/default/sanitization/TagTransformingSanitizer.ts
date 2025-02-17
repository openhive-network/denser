/**
 * This file is based on https://github.com/openhive-network/condenser/blob/master/src/app/utils/SanitizeConfig.js
 */
import ow from 'ow';
import sanitize from 'sanitize-html';
import {Log} from '../../../Log';
import {Localization, LocalizationOptions} from '../Localization';
import {StaticConfig} from '../StaticConfig';

export class TagTransformingSanitizer {
    private options: TagsSanitizerOptions;
    private localization: LocalizationOptions;
    private sanitizationErrors: string[] = [];

    public constructor(options: TagsSanitizerOptions, localization: LocalizationOptions) {
        this.validate(options);
        Localization.validate(localization);

        this.localization = localization;
        this.options = options;
    }

    public sanitize(text: string): string {
        return sanitize(text, this.generateSanitizeConfig());
    }

    public getErrors(): string[] {
        return this.sanitizationErrors;
    }

    private generateSanitizeConfig(): sanitize.IOptions {
        return {
            allowedTags: StaticConfig.sanitization.allowedTags,

            // SEE https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
            allowedAttributes: {
                // "src" MUST pass a whitelist (below)
                iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'webkitallowfullscreen', 'mozallowfullscreen'],

                // class attribute is strictly whitelisted (below)
                // and title is only set in the case of a phishing warning
                div: ['class', 'title'],

                // style is subject to attack, filtering more below
                td: ['style'],
                th: ['style'],
                img: ['src', 'alt'],

                // title is only set in the case of an external link warning
                a: ['href', 'rel', 'title', 'class', 'target', 'id']
            },
            allowedSchemes: ['http', 'https', 'hive'],
            transformTags: {
                iframe: (tagName: string, attributes: sanitize.Attributes) => {
                    const srcAtty = attributes.src;
                    for (const item of StaticConfig.sanitization.iframeWhitelist) {
                        if (item.re.test(srcAtty)) {
                            const src = typeof item.fn === 'function' ? item.fn(srcAtty) : srcAtty;
                            if (!src) {
                                break;
                            }
                            const iframeToBeReturned: sanitize.Tag = {
                                tagName: 'iframe',
                                attribs: {
                                    src,
                                    width: this.options.iframeWidth + '',
                                    height: this.options.iframeHeight + '',
                                    // some of there are deprecated but required for some embeds
                                    frameborder: '0',
                                    allowfullscreen: 'allowfullscreen',
                                    webkitallowfullscreen: 'webkitallowfullscreen',
                                    mozallowfullscreen: 'mozallowfullscreen'
                                }
                            };
                            return iframeToBeReturned;
                        }
                    }
                    Log.log().warn('Blocked, did not match iframe "src" white list urls:', tagName, attributes);
                    this.sanitizationErrors.push('Invalid iframe URL: ' + srcAtty);

                    const retTag: sanitize.Tag = {tagName: 'div', text: `(Unsupported ${srcAtty})`, attribs: {}};
                    return retTag;
                },
                img: (tagName, attribs) => {
                    if (this.options.noImage) {
                        const retTagOnImagesNotAllowed: sanitize.Tag = {
                            tagName: 'div',
                            text: this.localization.noImage,
                            attribs: {}
                        };
                        return retTagOnImagesNotAllowed;
                    }
                    // See https://github.com/punkave/sanitize-html/issues/117
                    const {src, alt} = attribs;
                    // eslint-disable-next-line security/detect-unsafe-regex
                    if (!/^(https?:)?\/\//i.test(src)) {
                        Log.log().warn('Blocked, image tag src does not appear to be a url', tagName, attribs);
                        this.sanitizationErrors.push('An image in this post did not save properly.');
                        const retTagOnNoUrl: sanitize.Tag = {
                            tagName: 'img',
                            attribs: {src: 'brokenimg.jpg'}
                        };
                        return retTagOnNoUrl;
                    }

                    const atts: sanitize.Attributes = {};
                    atts.src = src.replace(/^http:\/\//i, '//'); // replace http:// with // to force https when needed
                    if (alt && alt !== '') {
                        atts.alt = alt;
                    }
                    const retTag: sanitize.Tag = {tagName, attribs: atts};
                    return retTag;
                },
                div: (tagName, attribs) => {
                    const attys: sanitize.Attributes = {};
                    const classWhitelist = ['pull-right', 'pull-left', 'text-justify', 'text-rtl', 'text-center', 'text-right', 'videoWrapper', 'phishy'];
                    const validClass = classWhitelist.find((e) => attribs.class === e);
                    if (validClass) {
                        attys.class = validClass;
                    }
                    if (validClass === 'phishy' && attribs.title === this.localization.phishingWarning) {
                        attys.title = attribs.title;
                    }
                    const retTag: sanitize.Tag = {
                        tagName,
                        attribs: attys
                    };
                    return retTag;
                },
                td: (tagName, attribs) => {
                    const attys: sanitize.Attributes = {};
                    if (attribs.style === 'text-align:right') {
                        attys.style = 'text-align:right';
                    }
                    if (attribs.style === 'text-align:center') {
                        attys.style = 'text-align:center';
                    }
                    const retTag: sanitize.Tag = {
                        tagName,
                        attribs: attys
                    };
                    return retTag;
                },
                th: (tagName, attribs) => {
                    const attys: sanitize.Attributes = {};
                    if (attribs.style === 'text-align:right') {
                        attys.style = 'text-align:right';
                    }
                    if (attribs.style === 'text-align:center') {
                        attys.style = 'text-align:center';
                    }
                    const retTag: sanitize.Tag = {
                        tagName,
                        attribs: attys
                    };
                    return retTag;
                },
                a: (tagName, attribs) => {
                    const attys: sanitize.Attributes = {...attribs};
                    let {href} = attribs;
                    if (href) {
                        href = href.trim();
                        attys.href = href;
                    }
                    if (href && !this.options.isLinkSafeFn(href)) {
                        attys.rel = this.options.addNofollowToLinks ? 'nofollow noopener' : 'noopener';
                        attys.title = this.localization.phishingWarning;
                        attys.target = this.options.addTargetBlankToLinks ? '_blank' : '_self';
                    }
                    if (href && this.options.addExternalCssClassToMatchingLinksFn(href)) {
                        attys.class = this.options.cssClassForExternalLinks ? this.options.cssClassForExternalLinks : '';
                    } else {
                        attys.class = this.options.cssClassForInternalLinks ? this.options.cssClassForInternalLinks : '';
                    }
                    const retTag: sanitize.Tag = {
                        tagName,
                        attribs: attys
                    };
                    return retTag;
                }
            }
        };
    }
    private validate(o: TagsSanitizerOptions) {
        ow(o, 'TagsSanitizerOptions', ow.object);
        ow(o.iframeWidth, 'TagsSanitizerOptions.iframeWidth', ow.number.integer.positive);
        ow(o.iframeHeight, 'TagsSanitizerOptions.iframeHeight', ow.number.integer.positive);
        ow(o.addNofollowToLinks, 'TagsSanitizerOptions.addNofollowToLinks', ow.boolean);
        ow(o.addTargetBlankToLinks, 'TagsSanitizerOptions.addTargetBlankToLinks', ow.optional.boolean);
        ow(o.cssClassForInternalLinks, 'TagsSanitizerOptions.cssClassForInternalLinks', ow.optional.string);
        ow(o.cssClassForExternalLinks, 'TagsSanitizerOptions.cssClassForExternalLinks', ow.optional.string);
        ow(o.noImage, 'TagsSanitizerOptions.noImage', ow.boolean);
        ow(o.isLinkSafeFn, 'TagsSanitizerOptions.isLinkSafeFn', ow.function);
        ow(o.addExternalCssClassToMatchingLinksFn, 'TagsSanitizerOptions.addExternalCssClassToMatchingLinksFn', ow.function);
    }
}
export interface TagsSanitizerOptions {
    iframeWidth: number;
    iframeHeight: number;
    addNofollowToLinks: boolean;
    addTargetBlankToLinks?: boolean;
    cssClassForInternalLinks?: string;
    cssClassForExternalLinks?: string;
    noImage: boolean;
    isLinkSafeFn: (url: string) => boolean;
    addExternalCssClassToMatchingLinksFn: (url: string) => boolean;
}
