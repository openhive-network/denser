import ow from 'ow';
import {Log} from '../Log';
import {Phishing} from './Phishing';

/**
 * Dangerous URL protocols that could execute code or access sensitive resources.
 * @security These protocols are blocked to prevent XSS and data exfiltration.
 */
const DANGEROUS_PROTOCOLS = [
    'javascript:',
    'vbscript:',
    'data:',
    'file:',
    'blob:',
    'about:',
    'chrome:',
    'chrome-extension:',
    'moz-extension:',
    'ms-browser-extension:'
] as const;

/**
 * Patterns that indicate potential URL obfuscation attacks.
 * @security These patterns detect various encoding and formatting tricks.
 */
// eslint-disable-next-line no-control-regex
const OBFUSCATION_PATTERNS: ReadonlyArray<{pattern: RegExp; name: string}> = [
    // Encoded javascript protocol
    {pattern: /^j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i, name: 'spaced javascript protocol'},
    {pattern: /^&#/i, name: 'HTML entity at start'},
    {pattern: /%0[aAdD]/i, name: 'URL encoded newline'},
    {pattern: /%09/i, name: 'URL encoded tab'},

    // Unicode confusables for "javascript:" - detect control chars at start
    // eslint-disable-next-line no-control-regex
    {pattern: /^[\u0001-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\ufeff]/i, name: 'control/invisible characters'},

    // IDN homograph attacks (basic patterns)
    {pattern: /xn--.*\.com$/i, name: 'potential IDN homograph'},

    // Null byte injection - detect null chars
    // eslint-disable-next-line no-control-regex
    {pattern: /\x00/i, name: 'null byte'},

    // Backslash tricks (IE-specific but still check)
    {pattern: /^[a-z]+:\\/i, name: 'backslash after protocol'},

    // Protocol handler injection
    {pattern: /^[a-z][a-z0-9+.-]*:.*javascript:/i, name: 'nested javascript protocol'}
];

/**
 * Maximum URL length to prevent DoS attacks and buffer overflows.
 * Most browsers support URLs up to 2083 characters.
 */
const MAX_URL_LENGTH = 2083;

/**
 * Common legitimate protocols that are allowed.
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'hive:', 'mailto:', 'tel:'] as const;

export class LinkSanitizer {
    private options: LinkSanitizerOptions;
    private baseUrl: URL;
    private topLevelsBaseDomain: string;

    public constructor(options: LinkSanitizerOptions) {
        this.validate(options);
        this.options = options;
        this.baseUrl = new URL(this.options.baseUrl);
        this.topLevelsBaseDomain = LinkSanitizer.getTopLevelBaseDomainFromBaseUrl(this.baseUrl);
    }

    /**
     * Sanitizes a URL by checking for potential phishing attempts, dangerous protocols,
     * obfuscation techniques, and pseudo-local URLs.
     *
     * Security checks performed:
     * 1. URL length validation
     * 2. Dangerous protocol detection (javascript:, data:, etc.)
     * 3. Obfuscation pattern detection
     * 4. Phishing domain checking
     * 5. Pseudo-local URL attack detection
     *
     * @param url - The URL string to sanitize
     * @param urlTitle - The display text or title associated with the URL
     * @returns The sanitized URL string if safe, or false if the URL is potentially dangerous
     */
    public sanitizeLink(url: string, urlTitle: string): string | false {
        Log.log().debug('LinkSanitizer#sanitizeLink input', {url, urlTitle});

        // Step 1: Basic validation
        if (!url || typeof url !== 'string') {
            Log.log().debug('LinkSanitizer#sanitizeLink', 'empty or invalid URL');
            return false;
        }

        // Step 2: Trim and normalize whitespace
        url = url.trim();

        // Step 3: Check URL length (prevent DoS)
        if (url.length > MAX_URL_LENGTH) {
            Log.log().warn('LinkSanitizer#sanitizeLink', 'URL exceeds maximum length', {length: url.length, max: MAX_URL_LENGTH});
            return false;
        }

        // Step 4: Decode URL for inspection (to catch encoded attacks)
        const decodedUrl = this.safeDecodeUrl(url);

        // Step 5: Check for dangerous protocols BEFORE adding protocol
        if (this.hasDangerousProtocol(decodedUrl)) {
            Log.log().warn('LinkSanitizer#sanitizeLink', 'dangerous protocol detected', {url});
            return false;
        }

        // Step 6: Check for obfuscation patterns
        const obfuscation = this.detectObfuscation(decodedUrl);
        if (obfuscation) {
            Log.log().warn('LinkSanitizer#sanitizeLink', 'obfuscation detected', {url, pattern: obfuscation});
            return false;
        }

        // Step 7: Prepend protocol if missing
        url = this.prependUnknownProtocolLink(url);

        // Step 8: Check phishing domains
        if (Phishing.looksPhishy(url)) {
            Log.log().debug('LinkSanitizer#sanitizeLink', 'phishing link detected', 'phishing list', {url, urlTitle});
            return false;
        }

        // Step 9: Check for pseudo-local URL attacks
        if (this.isPseudoLocalUrl(url, urlTitle)) {
            Log.log().debug('LinkSanitizer#sanitizeLink', 'phishing link detected', 'pseudo local url', {url, urlTitle});
            return false;
        }

        // Step 10: Check for lookalike/confusable domain attacks
        if (this.isLookalikeDomain(url)) {
            Log.log().warn('LinkSanitizer#sanitizeLink', 'lookalike domain detected', {url});
            return false;
        }

        return url;
    }

    /**
     * Safely decodes a URL, handling malformed input.
     * @param url - URL to decode
     * @returns Decoded URL or original if decoding fails
     */
    private safeDecodeUrl(url: string): string {
        try {
            // First, try to decode any URL encoding
            let decoded = url;

            // Decode multiple times to catch double/triple encoding
            for (let i = 0; i < 3; i++) {
                const newDecoded = decodeURIComponent(decoded);
                if (newDecoded === decoded) break;
                decoded = newDecoded;
            }

            return decoded;
        } catch {
            // If decoding fails, return original
            return url;
        }
    }

    /**
     * Checks if a URL contains a dangerous protocol.
     * @param url - URL to check
     * @returns true if dangerous protocol found
     */
    private hasDangerousProtocol(url: string): boolean {
        const lowerUrl = url.toLowerCase().trim();

        // Remove leading whitespace and control characters (C0 and C1 control codes)
        // eslint-disable-next-line no-control-regex
        const cleanUrl = lowerUrl.replace(/^[\s\u0000-\u001f\u007f-\u009f]+/, '');

        // Check against dangerous protocols
        for (const protocol of DANGEROUS_PROTOCOLS) {
            if (cleanUrl.startsWith(protocol)) {
                return true;
            }
        }

        // Check for obfuscated javascript: with whitespace/control chars between letters
        // Tab (\t), newline (\n), carriage return (\r), etc. can be inserted
        /* eslint-disable no-control-regex */
        const jsPattern =
            /^[\s\u0000-\u0020]*j[\s\u0000-\u0020]*a[\s\u0000-\u0020]*v[\s\u0000-\u0020]*a[\s\u0000-\u0020]*s[\s\u0000-\u0020]*c[\s\u0000-\u0020]*r[\s\u0000-\u0020]*i[\s\u0000-\u0020]*p[\s\u0000-\u0020]*t[\s\u0000-\u0020]*:/i;
        /* eslint-enable no-control-regex */
        if (jsPattern.test(cleanUrl)) {
            return true;
        }

        return false;
    }

    /**
     * Detects URL obfuscation patterns.
     * @param url - URL to check
     * @returns Pattern name if obfuscation detected, null otherwise
     */
    private detectObfuscation(url: string): string | null {
        for (const {pattern, name} of OBFUSCATION_PATTERNS) {
            if (pattern.test(url)) {
                return name;
            }
        }
        return null;
    }

    /**
     * Detects lookalike/confusable domain attacks.
     * These use visually similar characters to impersonate legitimate domains.
     *
     * @param url - URL to check
     * @returns true if lookalike attack suspected
     */
    private isLookalikeDomain(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            // Check for common lookalike patterns for Hive ecosystem
            const hiveLookalikes = [
                /h[1il]ve\.blog/i, // h1ve, hlve, hive with I/l confusion
                /h[1il]ve\.io/i,
                /steern[1il]t/i, // steemit typos
                /steem[1il]t/i,
                /pe[a@]kd/i, // peakd lookalikes
                /sp[1il]nterlands/i, // splinterlands
                /ecenc[yij]/i // ecency
            ];

            for (const pattern of hiveLookalikes) {
                if (pattern.test(hostname)) {
                    return true;
                }
            }

            // Check for Unicode confusables (Cyrillic, Greek letters that look like Latin)
            // This is a basic check - comprehensive confusable detection is complex
            const hasConfusables = /[\u0400-\u04FF\u0370-\u03FF]/.test(hostname);
            if (hasConfusables && !hostname.startsWith('xn--')) {
                // Non-punycode domain with Cyrillic/Greek - suspicious
                return true;
            }

            return false;
        } catch {
            return false; // Invalid URL, let other checks handle it
        }
    }

    private static getTopLevelBaseDomainFromBaseUrl(url: URL) {
        const regex = /([^\s/$.?#]+\.[^\s/$.?#]+)$/g;
        const m = regex.exec(url.hostname);
        if (m && m[0]) return m[0];
        else {
            throw new Error(`LinkSanitizer: could not determine top level base domain from baseUrl hostname: ${url.hostname}`);
        }
    }

    /**
     * Prepends 'https://' to URLs that don't have a valid protocol.
     * Valid protocols are: relative paths, hash links, http://, https://, hive://, mailto:, tel:
     *
     * @param url - The URL string to check and potentially modify
     * @returns The URL string with 'https://' prepended if no valid protocol was found
     */
    private prependUnknownProtocolLink(url: string): string {
        // First check if it starts with an allowed protocol
        const lowerUrl = url.toLowerCase();
        for (const protocol of ALLOWED_PROTOCOLS) {
            if (lowerUrl.startsWith(protocol)) {
                return url;
            }
        }

        // Check for relative paths, hash links, and protocol-relative URLs
        if (/^((#)|(\/(?!\/))|(\/\/))/.test(url)) {
            return url;
        }

        // Default to https://
        return 'https://' + url;
    }

    /**
     * Checks if a URL might be attempting a pseudo-local phishing attack.
     * A pseudo-local URL is one where the display text (urlTitle) contains the base domain
     * but the actual URL points to a different domain, potentially deceiving users.
     *
     * For example:
     * - Base domain: example.com
     * - Display text: "Click here to visit example.com!"
     * - Actual URL: "https://malicious-site.com"
     *
     * @param url - The actual URL to check
     * @param urlTitle - The display text or title associated with the URL
     * @returns true if the URL appears to be a pseudo-local phishing attempt, false otherwise
     */
    private isPseudoLocalUrl(url: string, urlTitle: string): boolean {
        // Hash links are always safe (same-page navigation)
        if (url.startsWith('#')) return false;

        const lowerUrl = url.toLowerCase();
        const lowerTitle = urlTitle.toLowerCase();

        try {
            const urlTitleContainsBaseDomain = lowerTitle.includes(this.topLevelsBaseDomain);
            const urlContainsBaseDomain = lowerUrl.includes(this.topLevelsBaseDomain);
            // Suspicious: title mentions our domain but URL goes elsewhere
            if (urlTitleContainsBaseDomain && !urlContainsBaseDomain) {
                return true;
            }

            // Also check if title looks like a URL to a different domain
            // e.g., title="hive.blog/wallet" but URL goes to attacker.com
            const titleUrlMatch = lowerTitle.match(/(?:https?:\/\/)?([a-z0-9][-a-z0-9]*\.[a-z]{2,})/);
            if (titleUrlMatch) {
                const titleDomain = titleUrlMatch[1];
                try {
                    const actualUrlObj = new URL(lowerUrl);
                    if (!actualUrlObj.hostname.includes(titleDomain) && !titleDomain.includes(actualUrlObj.hostname)) {
                        // Title mentions different domain than actual URL
                        return true;
                    }
                } catch {
                    // URL parsing failed, already handled by other checks
                }
            }
        } catch (error) {
            if (error instanceof TypeError) {
                return false; // if url is invalid it is ok
            }
            throw error;
        }
        return false;
    }

    private validate(o: LinkSanitizerOptions) {
        ow(o, 'LinkSanitizerOptions', ow.object);
        ow(o.baseUrl, 'LinkSanitizerOptions.baseUrl', ow.string.nonEmpty);
    }

    /**
     * Returns the list of dangerous protocols being blocked.
     * Useful for documentation and debugging.
     *
     * @returns Array of blocked protocol strings
     */
    public static getDangerousProtocols(): readonly string[] {
        return DANGEROUS_PROTOCOLS;
    }

    /**
     * Returns the maximum allowed URL length.
     * @returns Maximum URL length in characters
     */
    public static getMaxUrlLength(): number {
        return MAX_URL_LENGTH;
    }
}

export interface LinkSanitizerOptions {
    baseUrl: string;
}
