/**
 * HTML Sanitizer with tag transformation support.
 *
 * Based on: https://github.com/openhive-network/condenser/blob/master/src/app/utils/SanitizeConfig.js
 *
 * @module TagTransformingSanitizer
 */
import ow from 'ow';
import sanitize from 'sanitize-html';
import {Log} from '../../../Log';
import {Localization, LocalizationOptions} from '../Localization';
import {StaticConfig} from '../StaticConfig';

// ============================================================================
// Constants
// ============================================================================

/** Allowed CSS classes for div elements */
const DIV_CLASS_WHITELIST = ['pull-right', 'pull-left', 'text-justify', 'text-rtl', 'text-center', 'text-right', 'videoWrapper', 'phishy'] as const;

/** Allowed table cell styles */
const ALLOWED_TABLE_STYLES = ['text-align:right', 'text-align:center', 'text-align:left'] as const;

/** Pattern to validate image URLs - only http/https and protocol-relative */
const VALID_IMAGE_URL_PATTERN = /^(https?:)?\/\//i;

/** Placeholder for broken images */
const BROKEN_IMAGE_PLACEHOLDER = 'brokenimg.jpg';

/** Allowed URL schemes - strict whitelist */
const ALLOWED_URL_SCHEMES = ['http', 'https', 'hive', 'mailto'];

/**
 * Dangerous patterns that should never appear in attribute values.
 * @security These patterns detect XSS attempts via attribute injection.
 */
const DANGEROUS_ATTR_PATTERNS: RegExp[] = [
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:/gi,
    /expression\s*\(/gi,
    /on\w+\s*=/gi,
    /&#/gi, // HTML entities in attributes
    /%[0-9a-f]{2}/gi // URL encoding in attributes (suspicious)
];

/**
 * Maximum src URL length for iframes and images.
 */
const MAX_SRC_LENGTH = 2083;

export class TagTransformingSanitizer {
    private options: TagsSanitizerOptions;
    private localization: LocalizationOptions;
    private sanitizationErrors: string[] = [];
    private currentPostContext?: PostContext;

    public constructor(options: TagsSanitizerOptions, localization: LocalizationOptions) {
        this.validate(options);
        Localization.validate(localization);

        this.localization = localization;
        this.options = options;
    }

    /**
     * Sanitizes HTML content by removing unsafe tags and attributes while transforming allowed tags according to configuration.
     * Uses the sanitize-html library with custom configuration for tag transformation.
     *
     * @param text - The HTML content to sanitize
     * @param postContext - Optional context about the post being rendered (for logging)
     * @returns A sanitized version of the HTML content with transformed tags and removed unsafe content
     */
    public sanitize(text: string, postContext?: PostContext): string {
        this.currentPostContext = postContext;
        return sanitize(text, this.generateSanitizeConfig());
    }

    private formatPostContext(): string {
        if (!this.currentPostContext) return '';
        const {author, permlink} = this.currentPostContext;
        if (author && permlink) return ` in @${author}/${permlink}`;
        if (author) return ` by @${author}`;
        return '';
    }

    public getErrors(): string[] {
        return this.sanitizationErrors;
    }

    /**
     * Generates configuration for the sanitize-html library.
     */
    private generateSanitizeConfig(): sanitize.IOptions {
        return {
            allowedTags: StaticConfig.sanitization.allowedTags,
            allowedAttributes: this.getAllowedAttributes(),
            allowedSchemes: ALLOWED_URL_SCHEMES,
            transformTags: {
                iframe: (_tagName, attribs) => this.transformIframe(attribs),
                img: (_tagName, attribs) => this.transformImage(attribs),
                div: (tagName, attribs) => this.transformDiv(tagName, attribs),
                td: (tagName, attribs) => this.transformTableCell(tagName, attribs),
                th: (tagName, attribs) => this.transformTableCell(tagName, attribs),
                a: (tagName, attribs) => this.transformAnchor(tagName, attribs)
            }
        };
    }

    /**
     * Returns allowed attributes configuration.
     * @see https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
     */
    private getAllowedAttributes(): sanitize.IOptions['allowedAttributes'] {
        return {
            iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'webkitallowfullscreen', 'mozallowfullscreen'],
            div: ['class', 'title'],
            td: ['style'],
            th: ['style'],
            img: ['src', 'alt'],
            a: ['href', 'rel', 'title', 'class', 'target', 'id']
        };
    }

    /**
     * Transforms iframe tags, validating against whitelist with enhanced security checks.
     * @security Performs multiple validation layers before allowing iframe.
     */
    private transformIframe(attribs: sanitize.Attributes): sanitize.Tag {
        const src = attribs.src;

        // Security: Check for empty or missing src
        if (!src || typeof src !== 'string') {
            Log.log().warn(`Blocked iframe (empty src)${this.formatPostContext()}`);
            return this.createBlockedIframeWarning('(empty)');
        }

        // Security: Check src length
        if (src.length > MAX_SRC_LENGTH) {
            Log.log().warn(`Blocked iframe (src too long: ${src.length})${this.formatPostContext()}`);
            this.sanitizationErrors.push(`Iframe URL too long: ${src.length} characters`);
            return this.createBlockedIframeWarning('(url too long)');
        }

        // Security: Check for dangerous patterns in src
        if (this.containsDangerousPattern(src)) {
            Log.log().warn(`Blocked iframe (dangerous pattern)${this.formatPostContext()}: src="${src.substring(0, 100)}..."`);
            this.sanitizationErrors.push(`Iframe URL contains dangerous pattern`);
            return this.createBlockedIframeWarning(src);
        }

        // Security: Validate against whitelist
        for (const whitelistItem of StaticConfig.sanitization.iframeWhitelist) {
            if (whitelistItem.re.test(src)) {
                const transformedSrc = whitelistItem.fn?.(src) ?? src;
                if (transformedSrc) {
                    // Double-check transformed src for safety
                    if (this.containsDangerousPattern(transformedSrc)) {
                        Log.log().warn(`Blocked iframe (dangerous pattern after transform)${this.formatPostContext()}`);
                        return this.createBlockedIframeWarning(src);
                    }
                    return this.createAllowedIframe(transformedSrc);
                }
                break;
            }
        }

        return this.createBlockedIframeWarning(src);
    }

    /**
     * Checks if a string contains dangerous patterns.
     * @param value - String to check
     * @returns true if dangerous pattern found
     */
    private containsDangerousPattern(value: string): boolean {
        const lowerValue = value.toLowerCase();
        for (const pattern of DANGEROUS_ATTR_PATTERNS) {
            pattern.lastIndex = 0; // Reset regex state
            if (pattern.test(lowerValue)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Creates an allowed iframe tag with standard attributes.
     */
    private createAllowedIframe(src: string): sanitize.Tag {
        return {
            tagName: 'iframe',
            attribs: {
                src,
                width: String(this.options.iframeWidth),
                height: String(this.options.iframeHeight),
                frameborder: '0',
                allowfullscreen: 'allowfullscreen',
                webkitallowfullscreen: 'webkitallowfullscreen',
                mozallowfullscreen: 'mozallowfullscreen'
            }
        };
    }

    /**
     * Creates a warning div for blocked iframes.
     */
    private createBlockedIframeWarning(src: string): sanitize.Tag {
        Log.log().warn(`Blocked iframe (not whitelisted)${this.formatPostContext()}: src="${src || '(empty)'}"`);
        this.sanitizationErrors.push(`Invalid iframe URL: ${src}`);
        return {tagName: 'div', text: `(Unsupported ${src})`, attribs: {}};
    }

    /**
     * Transforms image tags with enhanced security validation.
     * @security Validates src URL and sanitizes alt text.
     */
    private transformImage(attribs: sanitize.Attributes): sanitize.Tag {
        if (this.options.noImage) {
            return {tagName: 'div', text: this.localization.noImage, attribs: {}};
        }

        const {src, alt} = attribs;

        // Security: Check for empty src
        if (!src || typeof src !== 'string') {
            Log.log().warn(`Blocked image (empty src)${this.formatPostContext()}`);
            this.sanitizationErrors.push('An image in this post has no source.');
            return {tagName: 'img', attribs: {src: BROKEN_IMAGE_PLACEHOLDER}};
        }

        // Security: Check src length
        if (src.length > MAX_SRC_LENGTH) {
            Log.log().warn(`Blocked image (src too long: ${src.length})${this.formatPostContext()}`);
            this.sanitizationErrors.push('An image URL in this post is too long.');
            return {tagName: 'img', attribs: {src: BROKEN_IMAGE_PLACEHOLDER}};
        }

        // Security: Check for dangerous patterns in src
        if (this.containsDangerousPattern(src)) {
            Log.log().warn(`Blocked image (dangerous pattern)${this.formatPostContext()}: src="${src.substring(0, 100)}..."`);
            this.sanitizationErrors.push('An image in this post contains suspicious content.');
            return {tagName: 'img', attribs: {src: BROKEN_IMAGE_PLACEHOLDER}};
        }

        // Security: Validate URL pattern
        if (!VALID_IMAGE_URL_PATTERN.test(src)) {
            Log.log().warn(`Blocked image (invalid src)${this.formatPostContext()}: src="${src || '(empty)'}"`);
            this.sanitizationErrors.push('An image in this post did not save properly.');
            return {tagName: 'img', attribs: {src: BROKEN_IMAGE_PLACEHOLDER}};
        }

        const normalizedAttribs: sanitize.Attributes = {
            src: src.replace(/^http:\/\//i, '//') // Force protocol-relative URL
        };

        // Security: Sanitize alt text (strip HTML and limit length)
        if (alt && typeof alt === 'string') {
            // Strip any HTML tags from alt text and limit length
            const sanitizedAlt = alt
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/[<>"'&]/g, '') // Remove special chars that could break attributes
                .substring(0, 500); // Limit length
            if (sanitizedAlt) {
                normalizedAttribs.alt = sanitizedAlt;
            }
        }

        return {tagName: 'img', attribs: normalizedAttribs};
    }

    /**
     * Transforms div tags, filtering classes against whitelist.
     */
    private transformDiv(tagName: string, attribs: sanitize.Attributes): sanitize.Tag {
        const resultAttribs: sanitize.Attributes = {};

        const validClass = DIV_CLASS_WHITELIST.find((cls) => attribs.class === cls);
        if (validClass) {
            resultAttribs.class = validClass;

            // Only allow title for phishing warnings
            if (validClass === 'phishy' && attribs.title === this.localization.phishingWarning) {
                resultAttribs.title = attribs.title;
            }
        }

        return {tagName, attribs: resultAttribs};
    }

    /**
     * Transforms anchor tags with enhanced security attributes.
     * @security Validates href and adds protective attributes.
     */
    private transformAnchor(tagName: string, attribs: sanitize.Attributes): sanitize.Tag {
        const resultAttribs: sanitize.Attributes = {};
        const href = attribs.href?.trim();

        // Security: Validate href
        if (!href || typeof href !== 'string') {
            // No href - return span instead of anchor to prevent clickjacking
            return {tagName: 'span', attribs: {}, text: attribs.title || ''};
        }

        // Security: Check href length
        if (href.length > MAX_SRC_LENGTH) {
            Log.log().warn(`Blocked anchor (href too long: ${href.length})${this.formatPostContext()}`);
            return {tagName: 'span', attribs: {class: 'blocked-link'}, text: '(link removed - too long)'};
        }

        // Security: Check for dangerous patterns in href
        if (this.containsDangerousPattern(href)) {
            Log.log().warn(`Blocked anchor (dangerous pattern)${this.formatPostContext()}: href="${href.substring(0, 100)}..."`);
            return {tagName: 'span', attribs: {class: 'blocked-link'}, text: '(link removed - suspicious content)'};
        }

        // Security: Validate protocol
        const lowerHref = href.toLowerCase().trim();
        const hasValidProtocol =
            lowerHref.startsWith('http://') ||
            lowerHref.startsWith('https://') ||
            lowerHref.startsWith('hive://') ||
            lowerHref.startsWith('mailto:') ||
            lowerHref.startsWith('/') ||
            lowerHref.startsWith('#');

        if (!hasValidProtocol) {
            // Assume https for URLs without protocol
            resultAttribs.href = 'https://' + href;
        } else {
            resultAttribs.href = href;
        }

        // Security: Always add noopener to prevent tab-nabbing
        // Also add noreferrer for external links for privacy
        const isExternal = !this.options.isLinkSafeFn(resultAttribs.href);
        if (isExternal) {
            resultAttribs.rel = this.options.addNofollowToLinks ? 'nofollow noopener noreferrer' : 'noopener noreferrer';
            resultAttribs.target = this.options.addTargetBlankToLinks ? '_blank' : '_self';
        } else {
            // Internal links still get noopener for safety
            resultAttribs.rel = 'noopener';
        }

        // Security: Sanitize and copy other safe attributes
        if (attribs.title && typeof attribs.title === 'string') {
            // Sanitize title attribute
            resultAttribs.title = attribs.title
                .replace(/<[^>]*>/g, '')
                .replace(/[<>"']/g, '')
                .substring(0, 200);
        }

        if (attribs.id && typeof attribs.id === 'string') {
            // Sanitize id - only allow alphanumeric and hyphens
            const sanitizedId = attribs.id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100);
            if (sanitizedId) {
                resultAttribs.id = sanitizedId;
            }
        }

        // Apply CSS class based on link type
        resultAttribs.class = this.options.addExternalCssClassToMatchingLinksFn(resultAttribs.href)
            ? this.options.cssClassForExternalLinks || ''
            : this.options.cssClassForInternalLinks || '';

        return {tagName, attribs: resultAttribs};
    }
    /**
     * Transforms table cell tags (td/th), allowing only safe styles.
     */
    private transformTableCell(tagName: string, attribs: sanitize.Attributes): sanitize.Tag {
        const resultAttribs: sanitize.Attributes = {};

        if (ALLOWED_TABLE_STYLES.includes(attribs.style as (typeof ALLOWED_TABLE_STYLES)[number])) {
            resultAttribs.style = attribs.style;
        }

        return {tagName, attribs: resultAttribs};
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

export interface PostContext {
    author?: string;
    permlink?: string;
}
