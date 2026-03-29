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
        // Reset state for each parse call to prevent memory leaks when parser is reused.
        // This matches the original condenser behavior where fresh state is created per call.
        this.state = {
            hashtags: new Set(),
            usertags: new Set(),
            htmltags: new Set(),
            images: new Set(),
            links: new Set()
        };

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
                const parent = child.parentNode;
                if (parent) {
                    // Parse linkified content and insert children directly (without span wrapper)
                    // This fixes issue #632 where span wrappers could break table cell rendering
                    const tempDoc = this.domParser.parseFromString(`<span>${content}</span>`);
                    const wrapper = tempDoc.childNodes[0] as Element;
                    if (wrapper && wrapper.childNodes) {
                        Array.from(wrapper.childNodes).forEach((newChild) => {
                            parent.insertBefore(newChild.cloneNode(true), child);
                        });
                    }
                    parent.removeChild(child);
                }
                return;
            }
        } catch (error) {
            Log.log().error(error);
        }
    }

    /**
     * Processes text content to convert various elements into clickable links.
     *
     * This method handles three types of conversions:
     * 1. Plain text URLs into clickable links or images
     * 2. Hashtags (#tag) into links to tag pages
     * 3. User mentions (@user) into links to user profiles
     *
     * Processing rules:
     * - URLs:
     *   - Image URLs are converted to <img> tags
     *   - .exe and .zip URLs are left as plain text
     *   - Suspicious URLs are wrapped in warning divs
     *   - Other URLs become clickable links
     *
     * - Hashtags:
     *   - Must start with # followed by letters/numbers
     *   - Pure numbers (e.g., #123) are not converted
     *   - Converted to links using hashtagUrlFn
     *
     * - User mentions:
     *   - Must be valid account names
     *   - Converted to links using usertagUrlFn
     *   - Invalid usernames remain as plain text
     *
     * @param content - The text content to process
     * @returns Processed content with converted links
     *
     * @example
     * // Plain URL
     * linkify("Check https://example.com")
     * // Returns: 'Check <a href="https://example.com">https://example.com</a>'
     *
     * // Image URL
     * linkify("See https://example.com/img.jpg")
     * // Returns: 'See <img src="https://example.com/img.jpg" />'
     *
     * // Hashtag
     * linkify("Check #hive")
     * // Returns: 'Check <a href="/tag/hive">#hive</a>'
     *
     * // User mention
     * linkify("Hello @user")
     * // Returns: 'Hello <a href="/@user">@user</a>'
     */
    private linkify(content: string) {
        // plaintext links
        content = content.replace(linksAny('gi'), (ln) => {
            if (linksRe.image.test(ln)) {
                this.state.images.add(ln);
                return `<img src="${this.normalizeUrl(ln)}" alt="Embedded Image" />`;
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
 * 1. Removes wrapping <p> tags from <details> elements
 * 2. Removes wrapping <p> tags from <center> elements
 * 3. Moves content after details/center tags outside of them
 *
 * @param child - The HTML string to preprocess
 * @returns The preprocessed HTML string
 */
function preprocessHtml(child: string) {
    try {
        if (typeof child === 'string') {
            child = preprocessDetails(child);
            child = preprocessCenter(child);
            child = preprocessPullColumns(child);
        }
    } catch (error) {
        console.log(error);
    }

    return child;
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
 * Remarkable wraps block-level HTML tags in <p> tags in various ways depending
 * on surrounding blank lines. This function normalizes the output so that
 * <center> blocks are standalone elements, preventing centering from "leaking"
 * to content outside the <center> block.
 *
 * @param html - The HTML string to preprocess
 * @returns The preprocessed HTML string with properly formatted <center> elements
 */
function preprocessCenter(html: string): string {
    // Step 1: Remove <p> wrapping around standalone </center>
    // Remarkable places </center> in its own <p> when there's a blank line before it
    html = html.replace(/<p>\s*<\/center>\s*<\/p>/g, '</center>');

    // Step 1b: Extract </center> from paragraphs that also contain other content
    // Remarkable produces <p><img ...></center></p> when </center> follows content
    // without a blank line separating them → <p><img ...></p>\n</center>
    html = html.replace(/(<p>(?:(?!<\/p>)[\s\S])+?)\s*<\/center>\s*<\/p>/g, '$1</p>\n</center>');

    // Step 2: Remove wrapping <p> from self-contained center blocks
    // Use negative lookahead to avoid matching across </p> boundaries
    html = html.replace(/<p>\s*(<center>(?:(?!<\/p>)[\s\S])*?<\/center>)\s*<\/p>/g, '$1');

    // Step 2b: Handle <p><inline-tags><center>content</center></inline-tags></p>
    // Remarkable generates this from e.g. **<center>text</center>** producing
    // <p><strong><center>text</center></strong></p>. Rearrange so the block-level
    // <center> is on the outside: <center><strong>text</strong></center>
    html = html.replace(
        /<p>\s*((?:<(?:strong|em|b|i|u|s|del|strike|span)\b[^>]*>\s*)+)<center>([\s\S]*?)<\/center>\s*((?:<\/(?:strong|em|b|i|u|s|del|strike|span)>\s*)+)<\/p>/gi,
        '<center>$1$2$3</center>'
    );

    // Step 3: When <center> opens inside a paragraph, extract it
    // <p>text<center>content</p> → <p>text</p>\n<center>content
    // <p><center>content</p> → <center>content
    html = html.replace(/<p>((?:(?!<\/p>)[\s\S])*?)(<center>)/g, (_match, before, centerTag) => {
        if (before.trim()) {
            return `<p>${before}</p>\n${centerTag}`;
        }
        return centerTag;
    });

    // Step 4: Remove orphaned </p> after <center> content (from paragraph split above)
    // <center>content</p> → <center>content (only when no <p> opens before the </p>)
    html = html.replace(/(<center>(?:(?!<p[ >])[\s\S])*?)<\/p>/g, '$1');

    // Step 5: Move content after </pre> outside of center
    html = html.replace(/(<center>[\s\S]*?<\/pre>)([\s\S]*?)(<\/center>)/g, '$1$3$2');
    return html;
}

/** Result of extracting content from a div tag */
interface DivContentResult {
    /** The inner content of the div (between opening and closing tags) */
    content: string;
    /** Total length consumed including the opening and closing tags */
    length: number;
}

// Constants for div tag parsing
const DIV_OPEN_TAG = '<div';
const DIV_CLOSE_TAG = '</div>';
const DIV_OPEN_TAG_LENGTH = DIV_OPEN_TAG.length;
const DIV_CLOSE_TAG_LENGTH = DIV_CLOSE_TAG.length;

/**
 * Checks if a character indicates the end of a tag name.
 * Valid div tags end with '>' or whitespace, not alphanumeric (e.g., <divider> is not <div>).
 */
function isTagNameTerminator(char: string): boolean {
    return char === '' || char === '>' || /\s/.test(char);
}

/**
 * Extracts content from a div tag, properly handling nested divs.
 * Returns the content between the opening tag and its matching closing tag.
 *
 * @param html - The HTML string starting with a div tag
 * @returns Object with content and the full length consumed, or null if no match
 */
function extractDivContent(html: string): DivContentResult | null {
    if (!html.match(/^<div[\s>]/i)) {
        return null;
    }

    const openTagEnd = html.indexOf('>');
    if (openTagEnd === -1) {
        return null;
    }

    let depth = 1;
    let pos = openTagEnd + 1;
    const contentStart = pos;

    while (depth > 0 && pos < html.length) {
        const nextOpen = html.indexOf(DIV_OPEN_TAG, pos);
        const nextClose = html.indexOf(DIV_CLOSE_TAG, pos);

        if (nextClose === -1) {
            return null; // Malformed HTML - no closing tag
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
            // Check if it's actually a div tag (not <divider>, <division>, etc.)
            const charAfterTag = html.charAt(nextOpen + DIV_OPEN_TAG_LENGTH);
            if (isTagNameTerminator(charAfterTag)) {
                depth++;
            }
            pos = nextOpen + DIV_OPEN_TAG_LENGTH;
        } else {
            depth--;
            if (depth === 0) {
                return {
                    content: html.substring(contentStart, nextClose),
                    length: nextClose + DIV_CLOSE_TAG_LENGTH
                };
            }
            pos = nextClose + DIV_CLOSE_TAG_LENGTH;
        }
    }

    return null;
}

/**
 * Preprocesses HTML to handle pull-left/pull-right column pairs.
 *
 * Many Hive posts use adjacent pull-left and pull-right divs for bilingual content,
 * often with malformed HTML (unquoted attributes, missing closing divs). This function:
 * 1. Fixes unquoted class attributes on div tags
 * 2. Detects adjacent pull-left + pull-right pairs and wraps them in a flex container
 * 3. Handles optional text-justify wrapper divs and orphaned closing tags
 * 4. Properly handles nested divs inside pull-left/pull-right (e.g., text-justify)
 *
 * @param html - The HTML string to preprocess
 * @returns The preprocessed HTML with properly structured column pairs
 */
function preprocessPullColumns(html: string): string {
    // Step 1: Fix unquoted div class attributes: <div class=text-justify> → <div class="text-justify">
    html = html.replace(/<div\s+class=([^\s>"'][^\s>]*)/gi, '<div class="$1"');

    // Step 2: Process pull-left + pull-right pairs using proper div matching
    // This handles nested divs correctly (e.g., text-justify inside pull-right)
    html = processPullColumnPairs(html, 'pull-left', 'pull-right');

    // Also handle reverse order (pull-right first, then pull-left)
    html = processPullColumnPairs(html, 'pull-right', 'pull-left');

    return html;
}

/** Result of finding a column pair in HTML */
interface ColumnPairMatch {
    /** Start position of the match in the original HTML */
    matchStart: number;
    /** End position (exclusive) of the match in the original HTML */
    endPos: number;
    /** Content of the first column */
    firstContent: string;
    /** Content of the second column */
    secondContent: string;
}

/**
 * Creates a regex pattern to find the start of a pull column.
 * Handles optional text-justify wrapper before the pull div.
 */
function createColumnStartPattern(className: string): RegExp {
    return new RegExp(`(?:<div\\s+class="text-justify"\\s*>\\s*)?<div\\s+class="${className}"\\s*>`, 'gi');
}

/**
 * Creates a regex pattern to find the second column after the first.
 * Handles optional whitespace, empty paragraphs, and text-justify wrappers.
 */
function createSecondColumnPattern(className: string): RegExp {
    return new RegExp(`^\\s*(?:</div>)?\\s*(?:<p>\\s*</p>\\s*)*(?:<div\\s+class="text-justify"\\s*>\\s*)?<div\\s+class="${className}"\\s*>`, 'i');
}

/**
 * Inline tags that commonly wrap pull-column content in bilingual posts.
 * When these are opened inside a column but closed outside (straddling the div boundary),
 * xmldom drops the column's closing </div> tags, breaking the entire document structure.
 */
const INLINE_TAGS = ['i', 'b', 'em', 'strong', 'u', 's', 'del', 'strike', 'span', 'sup', 'sub'];

/**
 * Attempts to find a column pair starting at the given match position.
 * @returns The column pair match or null if no valid pair found
 */
function findColumnPair(html: string, matchStart: number, firstClass: string, secondClass: string): ColumnPairMatch | null {
    // Find where the first pull div actually starts
    const pullDivStart = html.indexOf(`<div class="${firstClass}"`, matchStart);
    if (pullDivStart === -1) {
        return null;
    }

    // Extract the first column content
    const firstCol = extractDivContent(html.substring(pullDivStart));
    if (!firstCol) {
        return null;
    }

    // Look for the second column after the first one
    const afterFirstCol = pullDivStart + firstCol.length;
    const remainingHtml = html.substring(afterFirstCol);

    // Check if second column follows
    const secondPattern = createSecondColumnPattern(secondClass);
    if (!secondPattern.test(remainingHtml)) {
        return null;
    }

    // Find where the second pull div actually starts
    const secondPullDivOffset = remainingHtml.indexOf(`<div class="${secondClass}"`);
    if (secondPullDivOffset === -1) {
        return null;
    }

    const secondCol = extractDivContent(remainingHtml.substring(secondPullDivOffset));
    if (!secondCol) {
        return null;
    }

    // Calculate end position (including any trailing orphaned closing tags)
    let endPos = afterFirstCol + secondPullDivOffset + secondCol.length;

    // Consume trailing orphaned inline closing tags and optional </div> from text-justify wrapper.
    // Pattern: optional whitespace, then any sequence of orphaned inline closing tags (e.g. </i>)
    // and optionally a </div> that closed a text-justify wrapper.
    const trailingPattern = new RegExp(
        `^(\\s*(?:<\\/(?:${INLINE_TAGS.join('|')})>\\s*)*)(?:<\\/div>)?`,
        'i'
    );
    const trailingMatch = html.substring(endPos).match(trailingPattern);
    if (trailingMatch && trailingMatch[0].length > 0) {
        endPos += trailingMatch[0].length;
    }

    return {
        matchStart,
        endPos,
        firstContent: firstCol.content,
        secondContent: secondCol.content
    };
}

/**
 * Finds unclosed inline tags in column content and closes them.
 *
 * Bilingual posts often use patterns like:
 *   <div class="pull-right"><i><div class="text-justify">...</div></div></i></div>
 *
 * After extractDivContent captures the pull-right content, the <i> is included
 * but </i> falls outside (it comes after the pull-right closing tag in the source).
 * When buildPullColumnsHtml wraps this content, the unclosed <i> prevents xmldom
 * from matching the </div> closing tags (block close inside open inline = invalid XML),
 * causing them to be silently dropped.
 *
 * This function detects such unclosed tags and appends closing tags to fix the nesting.
 *
 * @returns Object with the fixed content and any orphaned closing tags that were consumed
 */
function closeUnclosedInlineTags(content: string): { fixedContent: string; closingTags: string } {
    let closingTags = '';

    for (const tag of INLINE_TAGS) {
        const openPattern = new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'gi');
        const closePattern = new RegExp(`</${tag}>`, 'gi');
        const opens = (content.match(openPattern) || []).length;
        const closes = (content.match(closePattern) || []).length;

        for (let j = 0; j < opens - closes; j++) {
            closingTags += `</${tag}>`;
        }
    }

    return { fixedContent: content + closingTags, closingTags };
}

/**
 * Builds the pull-columns wrapper HTML for a column pair.
 * Closes any unclosed inline tags in column content to prevent xmldom
 * from dropping the wrapper's closing </div> tags.
 */
function buildPullColumnsHtml(firstClass: string, secondClass: string, firstContent: string, secondContent: string): string {
    const first = closeUnclosedInlineTags(firstContent);
    const second = closeUnclosedInlineTags(secondContent);
    return `<div class="pull-columns"><div class="${firstClass}">${first.fixedContent}</div><div class="${secondClass}">${second.fixedContent}</div></div>`;
}

/**
 * Processes pull column pairs in the HTML, wrapping them in a flex container.
 * Handles nested divs properly by counting depth.
 *
 * @param html - The HTML string to process
 * @param firstClass - The class of the first column ('pull-left' or 'pull-right')
 * @param secondClass - The class of the second column
 * @returns Processed HTML with column pairs wrapped
 */
function processPullColumnPairs(html: string, firstClass: string, secondClass: string): string {
    const firstPattern = createColumnStartPattern(firstClass);
    const parts: string[] = [];
    let lastIndex = 0;
    let match;

    while ((match = firstPattern.exec(html)) !== null) {
        const columnPair = findColumnPair(html, match.index, firstClass, secondClass);

        if (!columnPair) {
            continue;
        }

        // Add text before this match
        parts.push(html.substring(lastIndex, columnPair.matchStart));

        // Add the wrapped columns
        parts.push(buildPullColumnsHtml(firstClass, secondClass, columnPair.firstContent, columnPair.secondContent));

        lastIndex = columnPair.endPos;
        firstPattern.lastIndex = columnPair.endPos;
    }

    // Add remaining text
    parts.push(html.substring(lastIndex));

    return parts.join('');
}

