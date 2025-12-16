/**
 * HTML DOM Parser for processing Hive content.
 *
 * Based on: https://github.com/openhive-network/condenser/blob/master/src/shared/HtmlReady.js
 *
 * @module HtmlDOMParser
 */

import * as xmldom from '@xmldom/xmldom';
import ChainedError from 'typescript-chained-error';
import {Log} from '../../../Log';
import {LinkSanitizer} from '../../../security/LinkSanitizer';
import {Localization, LocalizationOptions} from '../Localization';
import {AssetEmbedder, AssetEmbedderOptions} from './AssetEmbedder';
import {YoutubeEmbedder} from './embedders/YoutubeEmbedder';
import {AccountNameValidator} from './utils/AccountNameValidator';
import linksRe, {any as linksAny} from './utils/Links';

// ============================================================================
// Constants
// ============================================================================

/** HTML tag names used for processing */
const HTML_TAGS = {
    IMG: 'img',
    IFRAME: 'iframe',
    ANCHOR: 'a',
    CODE: 'code',
    DIV: 'div',
    TEXT_NODE: '#text'
} as const;

/** CSS class names */
const CSS_CLASSES = {
    VIDEO_WRAPPER: 'videoWrapper',
    IMAGE_URL_ONLY: 'image-url-only',
    PHISHY: 'phishy'
} as const;

/** File extensions that should not be linkified (security risk) */
const BLOCKED_FILE_EXTENSIONS = /\.(zip|exe)$/i;

/** Pattern for protocol-relative URLs */
const PROTOCOL_RELATIVE_URL = /^\/\//;

export class HtmlDOMParser {
    private options: AssetEmbedderOptions;
    private localization: LocalizationOptions;
    private linkSanitizer: LinkSanitizer;
    public embedder: AssetEmbedder;

    /**
     * DOM parser with custom error handling.
     * Errors are logged at debug level to help diagnose malformed HTML without
     * flooding logs in production. DOM parsing errors are common with user-generated
     * content and usually don't indicate security issues.
     */
    private domParser = new xmldom.DOMParser({
        errorHandler: {
            warning: (msg: string) => {
                Log.log().debug('DOM Parser warning: %s', msg);
            },
            error: (msg: string) => {
                Log.log().debug('DOM Parser error: %s', msg);
            }
        }
    });
    private xmlSerializer = new xmldom.XMLSerializer();
    private state: State;
    private mutate = true;
    private parsedDocument: Document | undefined = undefined;

    public constructor(options: AssetEmbedderOptions, localization: LocalizationOptions = Localization.DEFAULT) {
        AssetEmbedder.validate(options);
        Localization.validate(localization);
        this.options = options;
        this.localization = localization;
        this.linkSanitizer = new LinkSanitizer({
            baseUrl: this.options.baseUrl
        });

        this.embedder = new AssetEmbedder(
            {
                ipfsPrefix: this.options.ipfsPrefix,
                width: this.options.width,
                height: this.options.height,
                hideImages: this.options.hideImages,
                imageProxyFn: this.options.imageProxyFn,
                hashtagUrlFn: this.options.hashtagUrlFn,
                usertagUrlFn: this.options.usertagUrlFn,
                baseUrl: this.options.baseUrl
            },
            localization
        );

        this.state = {
            hashtags: new Set(),
            usertags: new Set(),
            htmltags: new Set(),
            images: new Set(),
            links: new Set()
        };
    }

    public setMutateEnabled(mutate: boolean): HtmlDOMParser {
        this.mutate = mutate;
        return this;
    }

    /**
     * Parses HTML content and processes it for embedded content, links, images, and tags.
     *
     * @param html - The HTML string to parse
     * @returns The current HtmlDOMParser instance for method chaining
     * @throws {HtmlDOMParserError} When parsing fails
     *
     * @example
     * const parser = new HtmlDOMParser(options);
     * parser.parse('<p>Hello <a href="https://example.com">world</a></p>');
     */
    public parse(html: string): HtmlDOMParser {
        try {
            const doc: Document = this.domParser.parseFromString(preprocessHtml(html), 'text/html');
            this.traverseDOMNode(doc);
            if (this.mutate) this.postprocessDOM(doc);

            this.parsedDocument = doc;
        } catch (error) {
            throw new HtmlDOMParserError('Parsing error', error as Error);
        }
        return this;
    }

    public getState(): State {
        if (!this.parsedDocument) throw new HtmlDOMParserError('Html has not been parsed yet');
        return this.state;
    }

    public getParsedDocument(): Document {
        if (!this.parsedDocument) throw new HtmlDOMParserError('Html has not been parsed yet');
        return this.parsedDocument;
    }

    public getParsedDocumentAsString(): string {
        return this.xmlSerializer.serializeToString(this.getParsedDocument());
    }

    /**
     * Recursively traverses the DOM tree and processes nodes based on their types.
     *
     * @param node - The DOM node to traverse (Document or ChildNode)
     * @private
     */
    private traverseDOMNode(node: Document | ChildNode): void {
        if (!node?.childNodes) {
            return;
        }

        for (const child of Array.from(node.childNodes)) {
            const tag = this.getTagName(child);

            if (tag) {
                this.state.htmltags.add(tag);
                this.processElementByTag(child as HTMLObjectElement, tag);
            } else if (child.nodeName === HTML_TAGS.TEXT_NODE) {
                this.processTextNode(child as HTMLObjectElement);
            }

            this.traverseDOMNode(child);
        }
    }

    /**
     * Extracts lowercase tag name from a DOM node.
     */
    private getTagName(node: ChildNode): string | null {
        const element = node as Element;
        return element.tagName ? element.tagName.toLowerCase() : null;
    }

    /**
     * Routes element processing based on tag type.
     */
    private processElementByTag(element: HTMLObjectElement, tag: string): void {
        switch (tag) {
            case HTML_TAGS.IMG:
                this.processImgTag(element);
                break;
            case HTML_TAGS.IFRAME:
                this.processIframeTag(element);
                break;
            case HTML_TAGS.ANCHOR:
                this.processLinkTag(element);
                break;
        }
    }

    /**
     * Processes an anchor tag, handling link sanitization and phishing protection.
     *
     * @param element - The anchor element to process
     * @private
     */
    private processLinkTag(element: HTMLObjectElement): void {
        const parent = element.parentNode;
        if (!parent) return;

        const url = element.getAttribute('href');
        if (!url) return;

        this.state.links.add(url);

        if (!this.mutate) return;

        const urlTitle = element.textContent || '';
        const sanitizedLink = this.linkSanitizer.sanitizeLink(url, urlTitle);

        if (sanitizedLink === false) {
            this.replaceWithPhishingWarning(element, url);
        } else {
            element.setAttribute('href', sanitizedLink);
        }
    }

    /**
     * Replaces an element with a phishing warning div.
     */
    private replaceWithPhishingWarning(element: HTMLObjectElement, url: string): void {
        const parent = element.parentNode;
        if (!parent) return;

        const doc = element.ownerDocument as Document;
        const warningDiv = doc.createElement(HTML_TAGS.DIV);
        warningDiv.textContent = `${element.textContent} / ${url}`;
        warningDiv.setAttribute('title', this.localization.phishingWarning);
        warningDiv.setAttribute('class', CSS_CLASSES.PHISHY);

        parent.insertBefore(warningDiv, element);
        parent.removeChild(element);
    }

    /**
     * Processes an iframe tag, wrapping it in a responsive video wrapper.
     *
     * @param element - The iframe element to process
     * @private
     */
    private processIframeTag(element: HTMLObjectElement): void {
        const url = element.getAttribute('src');
        if (url) {
            this.extractYoutubeMetadata(url);
        }

        if (!this.mutate) return;

        if (this.isAlreadyWrapped(element)) return;

        this.wrapInVideoWrapper(element);
    }

    /**
     * Checks if an element is already wrapped in a video wrapper div.
     */
    private isAlreadyWrapped(element: HTMLObjectElement): boolean {
        const parent = element.parentNode as Element | null;
        if (!parent) return false;

        const parentTag = parent.tagName?.toLowerCase();
        const parentClass = parent.getAttribute?.('class');

        return parentTag === HTML_TAGS.DIV && parentClass === CSS_CLASSES.VIDEO_WRAPPER;
    }

    /**
     * Wraps an element in a video wrapper div for responsive display.
     */
    private wrapInVideoWrapper(element: HTMLObjectElement): void {
        const parent = element.parentNode;
        if (!parent) return;

        const html = this.xmlSerializer.serializeToString(element);
        const wrapper = this.domParser.parseFromString(`<div class="${CSS_CLASSES.VIDEO_WRAPPER}">${html}</div>`);

        parent.appendChild(wrapper);
        parent.removeChild(element);
    }

    /**
     * Extracts YouTube metadata from iframe URL and adds to state.
     */
    private extractYoutubeMetadata(url: string): void {
        const metadata = YoutubeEmbedder.getYoutubeMetadataFromLink(url);
        if (metadata) {
            this.state.links.add(metadata.url);
            this.state.images.add(metadata.thumbnail);
        }
    }

    /**
     * Processes an image tag, normalizing its URL.
     *
     * @param element - The img element to process
     * @private
     */
    private processImgTag(element: HTMLObjectElement): void {
        const url = element.getAttribute('src');
        if (!url) return;

        this.state.images.add(url);

        if (!this.mutate) return;

        const normalizedUrl = this.normalizeImageUrl(url);
        if (normalizedUrl !== url) {
            element.setAttribute('src', normalizedUrl);
        }
    }

    /**
     * Normalizes an image URL, converting protocol-relative to HTTPS.
     */
    private normalizeImageUrl(url: string): string {
        let normalized = this.normalizeUrl(url);

        if (PROTOCOL_RELATIVE_URL.test(normalized)) {
            normalized = 'https:' + normalized;
        }

        return normalized;
    }

    /**
     * Processes a text node, converting URLs, hashtags, and mentions to links.
     *
     * @param node - The text node to process
     * @private
     */
    private processTextNode(node: HTMLObjectElement): void {
        try {
            if (this.shouldSkipTextNode(node)) return;
            if (!node.data) return;

            this.processEmbeds(node);

            const originalContent = this.xmlSerializer.serializeToString(node);
            const processedContent = this.linkify(originalContent);

            if (this.mutate && processedContent !== originalContent) {
                this.replaceTextNodeWithProcessedContent(node, processedContent);
            }
        } catch (error) {
            Log.log().error(error);
        }
    }

    /**
     * Checks if a text node should be skipped (inside code or anchor tags).
     */
    private shouldSkipTextNode(node: HTMLObjectElement): boolean {
        const parent = node.parentNode;
        if (!parent) return false;

        const parentElement = parent as Element;
        const parentTag = parentElement.tagName?.toLowerCase() || null;
        return parentTag === HTML_TAGS.CODE || parentTag === HTML_TAGS.ANCHOR;
    }

    /**
     * Processes embeds in a text node and updates state.
     */
    private processEmbeds(node: HTMLObjectElement): void {
        const embedResult = this.embedder.processTextNodeAndInsertEmbeds(node);
        embedResult.images.forEach((img) => this.state.images.add(img));
        embedResult.links.forEach((link) => this.state.links.add(link));
    }

    /**
     * Replaces a text node with processed HTML content.
     */
    private replaceTextNodeWithProcessedContent(node: HTMLObjectElement, content: string): void {
        const parent = node.parentNode;
        if (!parent) return;

        const newNode = this.domParser.parseFromString(`<span>${content}</span>`).childNodes[0];
        parent.insertBefore(newNode, node);
        parent.removeChild(node);
    }

    /**
     * Converts URLs, hashtags, and mentions in text to clickable links.
     *
     * @param content - Text content to process
     * @returns Processed content with links
     */
    private linkify(content: string): string {
        content = this.linkifyUrls(content);
        content = this.linkifyHashtags(content);
        content = this.linkifyMentions(content);
        return content;
    }

    /**
     * Converts plain text URLs to clickable links or embedded images.
     */
    private linkifyUrls(content: string): string {
        return content.replace(linksAny('gi'), (url) => {
            // Embed images directly
            if (linksRe.image.test(url)) {
                this.state.images.add(url);
                return `<img src="${this.normalizeUrl(url)}" alt="Embedded Image" />`;
            }

            // Security: Don't linkify executable files
            if (BLOCKED_FILE_EXTENSIONS.test(url)) {
                return url;
            }

            // Check for phishing
            const sanitizedLink = this.linkSanitizer.sanitizeLink(url, url);
            if (sanitizedLink === false) {
                return `<div title='${this.localization.phishingWarning}' class='${CSS_CLASSES.PHISHY}'>${url}</div>`;
            }

            this.state.links.add(sanitizedLink);
            return `<a href="${this.normalizeUrl(url)}">${sanitizedLink}</a>`;
        });
    }

    /**
     * Converts hashtags to tag page links.
     */
    private linkifyHashtags(content: string): string {
        const HASHTAG_PATTERN = /(^|\s)(#[-a-z\d]+)/gi;
        const PURE_NUMBER_TAG = /#[\d]+$/;

        return content.replace(HASHTAG_PATTERN, (tag) => {
            // Skip pure numeric tags (e.g., #123)
            if (PURE_NUMBER_TAG.test(tag)) {
                return tag;
            }

            const leadingSpace = /^\s/.test(tag) ? tag[0] : '';
            const tagText = tag.trim();
            const tagName = tagText.substring(1).toLowerCase();

            this.state.hashtags.add(tagName);

            if (!this.mutate) {
                return tag;
            }

            const tagUrl = this.options.hashtagUrlFn(tagName);
            return `${leadingSpace}<a href="${tagUrl}">${tagText}</a>`;
        });
    }

    /**
     * Converts @mentions to user profile links.
     */
    private linkifyMentions(content: string): string {
        // Regex based on Twitter's implementation
        const MENTION_PATTERN = /(^|[^a-zA-Z0-9_!#$%&*@＠/]|(^|[^a-zA-Z0-9_+~.-/#]))[@＠]([a-z][-.a-z\d]+[a-z\d])/gi;

        return content.replace(MENTION_PATTERN, (_match, preceding1, preceding2, username) => {
            const usernameLower = username.toLowerCase();
            const isValidAccount = AccountNameValidator.validateAccountName(usernameLower, this.localization) == null;
            const precedingChars = (preceding1 || '') + (preceding2 || '');

            if (isValidAccount) {
                this.state.usertags.add(usernameLower);
            }

            if (!this.mutate) {
                return `${precedingChars}@${username}`;
            }

            if (isValidAccount) {
                const profileUrl = this.options.usertagUrlFn(usernameLower);
                return `${precedingChars}<a href="${profileUrl}">@${username}</a>`;
            }

            return `${precedingChars}@${username}`;
        });
    }

    /**
     * Applies post-processing transformations to the parsed DOM.
     */
    private postprocessDOM(doc: Document): void {
        if (this.options.hideImages) {
            this.replaceImagesWithUrls(doc);
        } else {
            this.applyImageProxy(doc);
        }
    }

    /**
     * Replaces all images with plain text URLs.
     */
    private replaceImagesWithUrls(doc: Document): void {
        const images = Array.from(doc.getElementsByTagName(HTML_TAGS.IMG));

        for (const image of images) {
            const parent = image.parentNode;
            if (!parent) continue;

            const urlText = doc.createElement('pre');
            urlText.setAttribute('class', CSS_CLASSES.IMAGE_URL_ONLY);
            urlText.appendChild(doc.createTextNode(image.getAttribute('src') || ''));

            parent.appendChild(urlText);
            parent.removeChild(image);
        }
    }

    /**
     * Applies image proxy to all non-local images.
     */
    private applyImageProxy(doc: Document): void {
        if (!doc) return;

        const images = Array.from(doc.getElementsByTagName(HTML_TAGS.IMG));

        for (const image of images) {
            const url = image.getAttribute('src') || '';
            const isLocalImage = linksRe.local.test(url);

            if (!isLocalImage) {
                image.setAttribute('src', this.options.imageProxyFn(url));
            }
        }
    }

    /**
     * Normalizes URLs by handling IPFS protocol conversions.
     *
     * This method performs the following transformations:
     * - If ipfsPrefix is configured and the URL uses IPFS protocol:
     *   - Converts URLs in format //ipfs/xxx, /ipfs/xxx, or ipfs://xxx
     *   - Transforms them into ${ipfsPrefix}/xxx
     *
     * @param url - The URL to normalize
     * @returns The normalized URL string. If no transformations apply, returns the original URL
     *
     * @example
     * // With ipfsPrefix = 'https://ipfs.io'
     * normalizeUrl('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')
     * // Returns: 'https://ipfs.io/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
     */
    private normalizeUrl(url: string): string {
        if (this.options.ipfsPrefix) {
            // Convert //ipfs/xxx  or /ipfs/xxx or ipfs://xxx into  ${ipfsPrefix}/xxx
            if (linksRe.ipfsProtocol.test(url)) {
                const match = url.match(linksRe.ipfsProtocol);
                if (match) {
                    const protocol = match[0];
                    const cid = url.replace(protocol, '');
                    return `${this.options.ipfsPrefix.replace(/\/+$/, '')}/${cid}`;
                }
            }
        }
        return url;
    }
}

export interface State {
    hashtags: Set<string>;
    usertags: Set<string>;
    htmltags: Set<string>;
    images: Set<string>;
    links: Set<string>;
}

export class HtmlDOMParserError extends ChainedError {
    public constructor(message?: string, cause?: Error) {
        super(message, cause);
    }
}

/** Block elements that need special preprocessing */
const BLOCK_ELEMENTS_TO_UNWRAP = ['details', 'center'] as const;

/**
 * Preprocesses HTML content before parsing.
 *
 * Handles:
 * - GitHub Gist embed codes → shortcode format
 * - Block elements (<details>, <center>) wrapped in <p> tags
 */
function preprocessHtml(html: string): string {
    if (typeof html !== 'string') return html;

    try {
        html = convertGistEmbedsToShortcodes(html);
        html = unwrapBlockElements(html);
    } catch (error) {
        Log.log().debug('Error preprocessing HTML: %o', error);
    }

    return html;
}

/**
 * Converts GitHub Gist script tags to shortcode format.
 */
function convertGistEmbedsToShortcodes(html: string): string {
    const gist = extractGistMetadata(html);
    if (gist) {
        const base64Id = Buffer.from(gist.fullId).toString('base64');
        html = html.replace(GIST_PATTERNS.htmlReplacement, `~~~ embed:${gist.id} gist metadata:${base64Id} ~~~`);
    }
    return html;
}

/**
 * Unwraps all block elements that may be incorrectly wrapped in <p> tags.
 */
function unwrapBlockElements(html: string): string {
    for (const tag of BLOCK_ELEMENTS_TO_UNWRAP) {
        html = unwrapBlockElement(html, tag);
    }
    return html;
}

interface GistMetadata {
    id: string;
    fullId: string;
    url: string;
    canonical: string;
    thumbnail: string | null;
    username: string;
}

/**
 * Removes wrapping <p> tags from block elements and fixes nested content.
 *
 * @param html - HTML string to process
 * @param tagName - The block element tag name (e.g., 'details', 'center')
 * @returns Processed HTML string
 */
function unwrapBlockElement(html: string, tagName: string): string {
    // Remove wrapping <p> from block element
    const unwrapPattern = new RegExp(`<p>\\s*(<${tagName}>[\\s\\S]*?<\\/${tagName}>)\\s*<\\/p>`, 'g');
    html = html.replace(unwrapPattern, '$1');

    // Move content after </pre> outside of the block element
    const fixNestedPattern = new RegExp(`(<${tagName}>[\\s\\S]*?<\\/pre>)([\\s\\S]*?)(<\\/${tagName}>)`, 'g');
    html = html.replace(fixNestedPattern, '$1$3$2');

    return html;
}

/**
 * Extracts metadata from a GitHub Gist embed code.
 */
function extractGistMetadata(html: string): GistMetadata | null {
    if (!html) return null;

    const match = html.match(GIST_PATTERNS.htmlReplacement);
    if (!match) return null;

    return {
        id: match[4],
        fullId: match[2],
        url: match[1],
        canonical: match[1],
        thumbnail: null,
        username: match[3]
    };
}

/** Regular expressions for GitHub Gist processing */
const GIST_PATTERNS = {
    /** Matches Gist URLs: https://gist.github.com/user/id */
    main: /(https?:\/\/gist\.github\.com\/((.*?)\/(.*)))/i,
    /** Matches Gist JS URLs: https://gist.github.com/user/id.js */
    sanitize: /(https:\/\/gist\.github\.com\/((.*?)\/(.*?))\.js)/i,
    /** Matches Gist script embeds: <script src="..."></script> */
    htmlReplacement: /<script src="(https:\/\/gist\.github\.com\/((.*?)\/(.*?))\.js)"><\/script>/i
};
