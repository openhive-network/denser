/* eslint-disable security/detect-non-literal-regexp */
/**
 * URL pattern matching utilities for content rendering.
 *
 * Based on: https://raw.githubusercontent.com/openhive-network/condenser/master/src/app/utils/Links.js
 *
 * @module Links
 */

// URL character patterns
const urlChar = '[^\\s"<>\\]\\[\\(\\)]';
const urlCharEnd = urlChar.replace(/\]$/, ".,']"); // insert bad chars to end on
const imagePath = '(?:(?:\\.(?:tiff?|jpe?g|gif|png|svg|ico|webp)|ipfs/[a-z\\d]{40,}))';
const domainPath = '(?:[-a-zA-Z0-9\\._]*[-a-zA-Z0-9])';
const urlChars = `(?:${urlChar}*${urlCharEnd})?`;

/**
 * Builds a URL pattern string for regex construction.
 */
const urlSet = ({domain = domainPath, path = ''} = {}): string => {
    return `https?://${domain}(?::\\d{2,5})?(?:[/\\?#]${urlChars}${path || ''})${path ? '' : '?'}`;
};

/**
 * Regex cache for patterns that are used with 'gi' (global) flags.
 * Global regexes are stateful, so we need to create new instances when using 'g' flag.
 * For non-global usage, use the pre-compiled cached versions in the default export.
 */
const regexCache = new Map<string, RegExp>();

/**
 * Creates a regex with caching for non-global patterns.
 * Global patterns (containing 'g') must be created fresh each time
 * because they maintain state between matches.
 */
function createCachedRegex(pattern: string, flags: string): RegExp {
    // Global regexes can't be cached - they're stateful
    if (flags.includes('g')) {
        return new RegExp(pattern, flags);
    }

    const key = `${pattern}|${flags}`;
    let cached = regexCache.get(key);
    if (!cached) {
        cached = new RegExp(pattern, flags);
        regexCache.set(key, cached);
    }
    return cached;
}

// Pre-computed pattern strings for better performance
const anyPattern = urlSet();
const localPattern = urlSet({domain: '(?:localhost|(?:.*\\.)?hive.blog)'});
const remotePattern = urlSet({domain: `(?!localhost|(?:.*\\.)?hive.blog)${domainPath}`});
const imagePattern = urlSet({path: imagePath});

/**
 * Creates a regex matching any URL.
 * @param flags - Regex flags (default: 'i' for case-insensitive)
 * @returns RegExp for matching URLs
 */
export const any = (flags = 'i'): RegExp => createCachedRegex(anyPattern, flags);

/**
 * Creates a regex matching local URLs (localhost or hive.blog).
 * @param flags - Regex flags (default: 'i' for case-insensitive)
 */
export const local = (flags = 'i'): RegExp => createCachedRegex(localPattern, flags);

/**
 * Creates a regex matching remote URLs (not localhost or hive.blog).
 * @param flags - Regex flags (default: 'i' for case-insensitive)
 */
export const remote = (flags = 'i'): RegExp => createCachedRegex(remotePattern, flags);

/**
 * Creates a regex matching image URLs.
 * @param flags - Regex flags (default: 'i' for case-insensitive)
 */
export const image = (flags = 'i'): RegExp => createCachedRegex(imagePattern, flags);

/**
 * Creates a regex matching image file extensions.
 * @param flags - Regex flags (default: 'i' for case-insensitive)
 */
export const imageFile = (flags = 'i'): RegExp => createCachedRegex(imagePath, flags);

/**
 * Pre-compiled regex patterns for common use cases.
 * Use these cached versions for better performance when not using global flag.
 */
export default {
    /** Matches any URL */
    any: any(),
    /** Matches local URLs (localhost, hive.blog) */
    local: local(),
    /** Matches remote URLs (not localhost or hive.blog) */
    remote: remote(),
    /** Matches image URLs */
    image: image(),
    /** Matches image file extensions */
    imageFile: imageFile(),
    /** Matches Vimeo URLs and extracts video ID */
    vimeo: /https?:\/\/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)\/?(#t=((\d+)s?))?\/?/,
    /** Extracts Vimeo video ID from URL */
    vimeoId: /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/,
    /** Matches Twitch URLs (channels and videos) */
    twitch: /https?:\/\/(?:www.)?twitch\.tv\/(?:(videos)\/)?([a-zA-Z0-9][\w]{3,24})/i,
    /** Matches IPFS protocol prefixes */
    ipfsProtocol: /^(?:\/\/?ipfs\/|ipfs:\/\/)/
} as const;
