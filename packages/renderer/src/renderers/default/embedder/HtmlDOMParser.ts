/**
 * Based on: https://github.com/openhive-network/condenser/blob/master/src/shared/HtmlReady.js
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

export class HtmlDOMParser {
    private options: AssetEmbedderOptions;
    private localization: LocalizationOptions;
    private linkSanitizer: LinkSanitizer;
    public embedder: AssetEmbedder;

    private domParser = new xmldom.DOMParser({
        errorHandler: {
            warning: () => {
                /* */
            },
            error: () => {
                /* */
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
            const doc: Document = this.domParser.parseFromString(preprocessHtml(html), 'text/xml');
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
     * This method performs the following operations:
     * - Collects HTML tags encountered during traversal
     * - Processes special tags (img, iframe, a) and text nodes
     * - Updates the parser's state with found tags, links, and images
     * - Applies mutations to the DOM if mutation is enabled
     *
     * @param node - The DOM node to traverse (Document or ChildNode)
     * @param depth - The current depth in the DOM tree (used for recursion)
     * @private
     */
    private traverseDOMNode(node: Document | ChildNode, depth = 0) {
        if (!node || !node.childNodes) {
            return;
        }

        Array.from(node.childNodes).forEach((child) => {
            const tag = (child as any).tagName ? (child as any).tagName.toLowerCase() : null;
            if (tag) {
                this.state.htmltags.add(tag);
            }

            if (tag === 'img') {
                this.processImgTag(child as HTMLObjectElement);
            } else if (tag === 'iframe') {
                this.processIframeTag(child as HTMLObjectElement);
            } else if (tag === 'a') {
                this.processLinkTag(child as HTMLObjectElement);
            } else if (child.nodeName === '#text') {
                this.processTextNode(child as HTMLObjectElement);
            }

            this.traverseDOMNode(child, depth + 1);
        });
    }

    /**
     * Processes an anchor tag in the DOM, handling link sanitization and phishing protection.
     *
     * This method:
     * - Extracts the href URL from the anchor tag
     * - Adds the URL to the state's links collection
     * - If mutation is enabled:
     *   - Sanitizes the link to protect against phishing attempts
     *   - For potentially dangerous links:
     *     - Replaces the anchor with a div containing phishing warning
     *     - Adds 'phishy' class and warning title
     *   - For safe links:
     *     - Updates the href attribute with the sanitized URL
     *
     * @param child - The anchor element to process
     * @private
     *
     * @example
     * // Safe link:
     * // Input:  <a href="http://example.com">Link</a>
     * // Output: <a href="http://example.com">Link</a>
     *
     * // Suspicious link:
     * // Input:  <a href="http://suspicious-site.com">Link</a>
     * // Output: <div class="phishy" title="[phishing warning]">Link / http://suspicious-site.com</div>
     */
    private processLinkTag(child: HTMLObjectElement) {
        const parent = child.parentNode;
        if (!parent) return;

        const url = child.getAttribute('href');
        if (url) {
            this.state.links.add(url);
            if (this.mutate) {
                const urlTitle = child.textContent || '';
                const sanitizedLink = this.linkSanitizer.sanitizeLink(url, urlTitle);
                if (sanitizedLink === false) {
                    const phishyDiv = (child.ownerDocument as Document).createElement('div');
                    phishyDiv.textContent = `${child.textContent} / ${url}`;
                    phishyDiv.setAttribute('title', this.localization.phishingWarning);
                    phishyDiv.setAttribute('class', 'phishy');
                    parent.insertBefore(phishyDiv, child);
                    parent.removeChild(child);
                } else {
                    child.setAttribute('href', sanitizedLink);
                }
            }
        }
    }

    /**
     * Processes an iframe tag in the DOM, wrapping it in a div for responsive display.
     *
     * This method:
     * - Extracts and reports the iframe's source URL
     * - If mutation is enabled:
     *   - Wraps the iframe in a div with class 'videoWrapper' for responsive sizing
     *   - Only wraps if not already wrapped in a videoWrapper div
     * - Maintains the original iframe attributes and content
     *
     * @param child - The iframe element to process
     * @private
     *
     * @example
     * // Input:  <iframe src="https://youtube.com/embed/123"></iframe>
     * // Output: <div class="videoWrapper"><iframe src="https://youtube.com/embed/123"></iframe></div>
     */
    private processIframeTag(child: HTMLObjectElement) {
        const url = child.getAttribute('src');
        if (url) this.reportIframeLink(url);

        if (!this.mutate) {
            return;
        }

        const tag = (child as any).parentNode.tagName ? (child as any).parentNode.tagName.toLowerCase() : (child as any).parentNode.tagName;
        if (tag === 'div' && (child as any).parentNode.getAttribute('class') === 'videoWrapper') {
            return;
        }
        const html = this.xmlSerializer.serializeToString(child);
        const wrapper = this.domParser.parseFromString(`<div class="videoWrapper">${html}</div>`);
        const parent = child.parentNode;
        if (parent) {
            parent.appendChild(wrapper);
            parent.removeChild(child);
        }
    }

    /**
     * Reports an iframe's source URL by extracting and storing its metadata.
     * Currently only processes YouTube links, extracting video ID and thumbnail URL.
     *
     * @param url - The source URL of the iframe to process
     * @private
     *
     * @example
     * // For a YouTube iframe with URL 'https://www.youtube.com/embed/dQw4w9WgXcQ'
     * // Adds the following to state:
     * // - links: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
     * // - images: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg'
     */
    private reportIframeLink(url: string) {
        const yt = YoutubeEmbedder.getYoutubeMetadataFromLink(url);
        if (yt) {
            this.state.links.add(yt.url);
            this.state.images.add('https://img.youtube.com/vi/' + yt.id + '/0.jpg');
        }
    }

    /**
     * Processes an image tag in the DOM, handling its source URL and applying necessary transformations.
     *
     * This method:
     * - Extracts the source URL from the img tag
     * - Adds the URL to the state's image collection
     * - If mutation is enabled:
     *   - Normalizes the URL protocol (converts relative protocols to https)
     *   - Updates the src attribute if the URL was modified
     *
     * @param child - The img element to process
     * @private
     */
    private processImgTag(child: HTMLObjectElement) {
        const url = child.getAttribute('src');
        if (url) {
            this.state.images.add(url);
            if (this.mutate) {
                let url2 = this.normalizeUrl(url);
                if (/^\/\//.test(url2)) {
                    url2 = 'https:' + url2;
                }
                if (url2 !== url) {
                    child.setAttribute('src', url2);
                }
            }
        }
    }

    /**
     * Processes a text node in the DOM, handling special content like hashtags, mentions, and links.
     *
     * This method:
     * - Skips processing if the text node is within <code> or <a> tags
     * - Processes embedded content through AssetEmbedder
     * - Converts plain text URLs into clickable links
     * - Processes hashtags and mentions
     * - Updates the state with found links and images
     *
     * If mutation is enabled and content changes:
     * - Creates a new span element with the processed content
     * - Replaces the original text node with the new span
     *
     * @param child - The text node to process (as HTMLObjectElement)
     * @returns The new node if content was mutated, undefined otherwise
     * @throws Logs error if processing fails but continues execution
     *
     * @example
     * // Input text node: "Check out #hive and @user"
     * // Output: <span>Check out <a href="/tag/hive">#hive</a> and <a href="/@user">@user</a></span>
     */
    private processTextNode(child: HTMLObjectElement) {
        try {
            const tag = (child.parentNode as any).tagName ? (child.parentNode as any).tagName.toLowerCase() : (child.parentNode as any).tagName;
            if (tag === 'code') {
                return;
            }
            if (tag === 'a') {
                return;
            }

            if (!child.data) {
                return;
            }

            const embedResp = this.embedder.processTextNodeAndInsertEmbeds(child);
            embedResp.images.forEach((img) => this.state.images.add(img));
            embedResp.links.forEach((link) => this.state.links.add(link));

            const data = this.xmlSerializer.serializeToString(child);
            const content = this.linkify(data);
            if (this.mutate && content !== data) {
                const newChild = this.domParser.parseFromString(`<span>${content}</span>`).childNodes[0];
                const parent = child.parentNode;
                if (parent) {
                    parent.insertBefore(newChild, child);
                    parent.removeChild(child);
                    parent.appendChild;
                }
                return;
            }
        } catch (error) {
            Log.log().error(error);
        }
    }

    private linkify(content: string) {
        // plaintext links
        content = content.replace(linksAny('gi'), (ln) => {
            if (linksRe.image.test(ln)) {
                this.state.images.add(ln);
                return `<img src="${this.normalizeUrl(ln)}" />`;
            }

            // do not linkify .exe or .zip urls
            if (/\.(zip|exe)$/i.test(ln)) {
                return ln;
            }

            // do not linkify phishy links
            const sanitizedLink = this.linkSanitizer.sanitizeLink(ln, ln);
            if (sanitizedLink === false) {
                return `<div title='${this.localization.phishingWarning}' class='phishy'>${ln}</div>`;
            }

            this.state.links.add(sanitizedLink);
            return `<a href="${this.normalizeUrl(ln)}">${sanitizedLink}</a>`;
        });

        // hashtag
        content = content.replace(/(^|\s)(#[-a-z\d]+)/gi, (tag) => {
            if (/#[\d]+$/.test(tag)) {
                return tag;
            } // Don't allow numbers to be tags
            const space = /^\s/.test(tag) ? tag[0] : '';
            const tag2 = tag.trim().substring(1);
            const tagLower = tag2.toLowerCase();
            this.state.hashtags.add(tagLower);
            if (!this.mutate) {
                return tag;
            }
            const tagUrl = this.options.hashtagUrlFn(tagLower);
            return space + `<a href="${tagUrl}">${tag.trim()}</a>`;
        });

        // usertag (mention)
        // Cribbed from https://github.com/twitter/twitter-text/blob/v1.14.7/js/twitter-text.js#L90
        content = content.replace(/(^|[^a-zA-Z0-9_!#$%&*@＠/]|(^|[^a-zA-Z0-9_+~.-/#]))[@＠]([a-z][-.a-z\d]+[a-z\d])/gi, (_match, preceeding1, preceeding2, user) => {
            const userLower = user.toLowerCase();
            const valid = AccountNameValidator.validateAccountName(userLower, this.localization) == null;

            if (valid && this.state.usertags) {
                this.state.usertags.add(userLower);
            }

            // include the preceeding matches if they exist
            const preceedings = (preceeding1 || '') + (preceeding2 || '');

            if (!this.mutate) {
                return `${preceedings}${user}`;
            }

            const userTagUrl = this.options.usertagUrlFn(userLower);
            return valid ? `${preceedings}<a href="${userTagUrl}">@${user}</a>` : `${preceedings}@${user}`;
        });
        return content;
    }

    /**
     * Performs post-processing operations on the parsed DOM.
     *
     * This method applies final transformations to the document after the main parsing
     * is complete. It handles two specific operations:
     * 1. Image hiding - If hideImages option is enabled, replaces images with their URLs
     * 2. Image proxifying - If image proxying is enabled, adds proxy URLs to images
     *
     * These operations are only performed if mutation is enabled in the parser.
     *
     * @param doc - The Document object to post-process
     * @private
     */
    private postprocessDOM(doc: Document) {
        this.hideImagesIfNeeded(doc);
        this.proxifyImagesIfNeeded(doc);
    }

    /**
     * Replaces image elements with their URLs if image hiding is enabled.
     *
     * This method checks if both mutation and hideImages options are enabled.
     * If they are, it:
     * 1. Finds all img elements in the document
     * 2. Creates a pre element with class 'image-url-only' for each image
     * 3. Sets the pre element's text content to the image's src URL
     * 4. Replaces the original img element with the pre element
     *
     * @param doc - The Document object containing the DOM to process
     * @private
     *
     * @example
     * // Input:  <img src="https://example.com/image.jpg">
     * // Output: <pre class="image-url-only">https://example.com/image.jpg</pre>
     */
    private hideImagesIfNeeded(doc: Document) {
        if (this.mutate && this.options.hideImages) {
            for (const image of Array.from(doc.getElementsByTagName('img'))) {
                const pre = doc.createElement('pre');
                pre.setAttribute('class', 'image-url-only');
                pre.appendChild(doc.createTextNode(image.getAttribute('src') || ''));
                const parent = image.parentNode;
                if (parent) {
                    parent.appendChild(pre);
                    parent.removeChild(image);
                }
            }
        }
    }

    /**
     * Applies image proxying to all images in the document if enabled.
     *
     * This method checks if both mutation is enabled and image hiding is disabled.
     * If these conditions are met, it calls proxifyImages to process all image URLs
     * in the document through the configured image proxy.
     *
     * @param doc - The Document object containing the DOM to process
     * @private
     *
     * @example
     * // With imageProxyFn = url => `https://images.example.com/${url}`
     * // Input:  <img src="https://original.com/image.jpg">
     * // Output: <img src="https://images.example.com/https://original.com/image.jpg">
     */
    private proxifyImagesIfNeeded(doc: Document) {
        if (this.mutate && !this.options.hideImages) {
            this.proxifyImages(doc);
        }
    }

    /**
     * Applies proxy URLs to all non-local images in the document.
     *
     * This method:
     * - Finds all img elements in the document
     * - For each image with a non-local URL (not matching linksRe.local pattern):
     *   - Transforms the src URL using the configured imageProxyFn
     * - Local images are left unchanged
     *
     * @param doc - The Document object containing the DOM to process
     * @private
     *
     * @example
     * // With imageProxyFn = url => `https://proxy.com/${url}`
     * // Input:  <img src="https://example.com/image.jpg">
     * // Output: <img src="https://proxy.com/0x0/https://example.com/image.jpg">
     */
    private proxifyImages(doc: Document) {
        if (!doc) {
            return;
        }
        Array.from(doc.getElementsByTagName('img')).forEach((node) => {
            const url: string = node.getAttribute('src') || '';
            if (!linksRe.local.test(url)) {
                node.setAttribute('src', this.options.imageProxyFn(url));
            }
        });
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
    private normalizeUrl(url: any) {
        if (this.options.ipfsPrefix) {
            // Convert //ipfs/xxx  or /ipfs/xxx or ipfs://xxx into  ${ipfsPrefix}/xxx
            if (linksRe.ipfsProtocol.test(url)) {
                const [protocol] = url.match(linksRe.ipfsProtocol);
                const cid = url.replace(protocol, '');
                return `${this.options.ipfsPrefix.replace(/\/+$/, '')}/${cid}`;
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

/**
 * Preprocesses HTML content before parsing to handle special cases.
 *
 * This function performs the following transformations:
 * 1. Replaces GitHub gist embed code with a shortcode format
 * 2. Removes wrapping <p> tags from <details> elements
 * 3. Removes wrapping <p> tags from <center> elements
 * 4. Moves content after details/center tags outside of them
 *
 * @param child - The HTML string to preprocess
 * @returns The preprocessed HTML string
 */
function preprocessHtml(child: string) {
    try {
        if (typeof child === 'string') {
            const gist = extractMetadataFromEmbedCode(child);
            if (gist) {
                child = child.replace(regex.htmlReplacement, `~~~ embed:${gist.id} gist metadata:${Buffer.from(gist.fullId).toString('base64')} ~~~`);
            }
            child = preprocessDetails(child);
            child = preprocessCenter(child);
        }
    } catch (error) {
        console.log(error);
    }

    return child;
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
 * Preprocesses HTML content to properly handle <details> tags.
 *
 * This function performs the following transformations:
 * 1. Removes wrapping <p> tags from <details> elements
 * 2. Moves any content that appears after <pre> tags outside of the <details> element
 *
 * @param html - The HTML string to preprocess
 * @returns The preprocessed HTML string with properly formatted <details> elements
 *
 * @example
 * const processed = preprocessDetails('<p><details></p>Content<p></details></p>');
 * // Returns: '<details>Content</details>'
 */
function preprocessDetails(html: string): string {
    // Remove wrapping <p> from details
    html = html.replace(/<p>\s*(<details>[\s\S]*?<\/details>)\s*<\/p>/g, '$1');
    // Move content after details outside of it
    html = html.replace(/(<details>[\s\S]*?<\/pre>)([\s\S]*?)(<\/details>)/g, '$1$3$2');
    return html;
}

/**
 * Preprocesses HTML content to properly handle <center> tags.
 *
 * This function performs the following transformations:
 * 1. Removes wrapping <p> tags from <center> elements
 * 2. Moves any content that appears after <pre> tags outside of the <center> element
 *
 * @param html - The HTML string to preprocess
 * @returns The preprocessed HTML string with properly formatted <center> elements
 *
 * @example
 * const processed = preprocessCenter('<p><center></p>Content<p></center></p>');
 * // Returns: '<center>Content</center>'
 */
function preprocessCenter(html: string): string {
    html = html.replace(/<p>\s*(<center>[\s\S]*?<\/center>)\s*<\/p>/g, '$1');
    html = html.replace(/(<center>[\s\S]*?<\/pre>)([\s\S]*?)(<\/center>)/g, '$1$3$2');
    return html;
}

/**
 * Extracts metadata from a GitHub Gist embed code.
 *
 * @param data - The HTML string containing the Gist embed code
 * @returns A GistMetadata object containing the extracted information, or null if no valid Gist embed code is found
 *
 * @example
 * const embedCode = '<script src="https://gist.github.com/username/123456.js"></script>';
 * const metadata = extractMetadataFromEmbedCode(embedCode);
 * // Returns:
 * // {
 * //   id: '123456',
 * //   fullId: 'username/123456',
 * //   url: 'https://gist.github.com/username/123456.js',
 * //   canonical: 'https://gist.github.com/username/123456.js',
 * //   thumbnail: null,
 * //   username: 'username'
 *  }
 */
function extractMetadataFromEmbedCode(data: string): GistMetadata | null {
    if (!data) return null;

    const match: RegExpMatchArray | null = data.match(regex.htmlReplacement);
    if (match) {
        const url: string = match[1];
        const fullId: string = match[2];
        const username: string = match[3];
        const id: string = match[4];

        return {
            id,
            fullId,
            url,
            canonical: url,
            thumbnail: null,
            username
        };
    }
    return null;
}

/**
 * Regular expressions used for GitHub Gist processing.
 *
 * @property {RegExp} main - Matches GitHub Gist URLs in the format:
 *                          https://gist.github.com/username/gistId
 *                          Groups: [full URL, username/gistId, username, gistId]
 *
 * @property {RegExp} sanitize - Matches GitHub Gist JavaScript URLs in the format:
 *                              https://gist.github.com/username/gistId.js
 *                              Groups: [full URL with .js, username/gistId, username, gistId]
 *
 * @property {RegExp} htmlReplacement - Matches GitHub Gist script embed tags in the format:
 *                                     <script src="https://gist.github.com/username/gistId.js"></script>
 *                                     Groups: [script URL, username/gistId, username, gistId]
 */
const regex = {
    main: /(https?:\/\/gist\.github\.com\/((.*?)\/(.*)))/i,
    sanitize: /(https:\/\/gist\.github\.com\/((.*?)\/(.*?))\.js)/i,
    htmlReplacement: /<script src="(https:\/\/gist\.github\.com\/((.*?)\/(.*?))\.js)"><\/script>/i
};
