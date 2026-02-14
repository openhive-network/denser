import ow from 'ow';
import {Log} from '../Log';
import {Phishing} from './Phishing';

// Private IPv4 ranges per RFC 1918 and special addresses
const PRIVATE_IPV4_PATTERNS = [
    /^127\./, // Loopback (127.0.0.0/8)
    /^10\./, // Class A private (10.0.0.0/8)
    /^192\.168\./, // Class C private (192.168.0.0/16)
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private (172.16.0.0/12)
    /^169\.254\./, // Link-local (169.254.0.0/16)
    /^0\./ // Current network (0.0.0.0/8)
];

// Private/special hostnames
const PRIVATE_HOSTNAMES = ['localhost', 'localhost.localdomain'];

// IPv6 loopback and link-local patterns
const PRIVATE_IPV6_PATTERNS = [
    /^::1$/, // Loopback
    /^fe80:/i, // Link-local
    /^fc00:/i, // Unique local (fc00::/7)
    /^fd[0-9a-f]{2}:/i // Unique local (fd00::/8)
];

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
     * Sanitizes a URL by checking for potential phishing attempts and pseudo-local URLs.
     * Automatically prepends 'https://' protocol if the URL doesn't have a valid protocol.
     *
     * @param url - The URL string to sanitize
     * @param urlTitle - The display text or title associated with the URL
     * @returns The sanitized URL string if safe, or false if the URL is potentially dangerous
     */
    public sanitizeLink(url: string, urlTitle: string): string | false {
        url = this.prependUnknownProtocolLink(url);

        // Commented out: broken log that doesn't display url/urlTitle, just noise
        // Log.log().debug('LinkSanitizer#sanitizeLink', {url, urlTitle});

        if (Phishing.looksPhishy(url)) {
            Log.log().debug('LinkSanitizer#sanitizeLink', 'phishing link detected', 'phishing list', url, {
                url,
                urlTitle
            });
            return false;
        }

        if (this.isPseudoLocalUrl(url, urlTitle)) {
            Log.log().debug('LinkSanitizer#sanitizeLink', 'phishing link detected', 'pseudo local url', url, {
                url,
                urlTitle
            });
            return false;
        }

        // Block private network URLs in production (security hardening)
        if (LinkSanitizer.isPrivateNetworkUrl(url)) {
            Log.log().debug('LinkSanitizer#sanitizeLink', 'private network URL blocked', url, {
                url,
                urlTitle
            });
            return false;
        }

        return url;
    }

    /**
     * Checks if a URL points to a private/internal network address.
     * In production mode, these are blocked to prevent potential information leakage.
     * In development mode (NODE_ENV !== 'production'), private network URLs are allowed.
     *
     * @param url - The URL string to check
     * @returns true if the URL points to a private network address (and should be blocked)
     */
    public static isPrivateNetworkUrl(url: string): boolean {
        // Allow private network URLs in development mode
        if (process.env.NODE_ENV !== 'production') {
            return false;
        }

        try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.toLowerCase();

            // Check for private hostnames
            if (PRIVATE_HOSTNAMES.includes(hostname)) {
                return true;
            }

            // Check for IPv4 private ranges
            for (const pattern of PRIVATE_IPV4_PATTERNS) {
                if (pattern.test(hostname)) {
                    return true;
                }
            }

            // Check for IPv6 private/special addresses
            // URL parser wraps IPv6 in brackets, so we need to strip them
            const ipv6Hostname = hostname.replace(/^\[|\]$/g, '');
            for (const pattern of PRIVATE_IPV6_PATTERNS) {
                if (pattern.test(ipv6Hostname)) {
                    return true;
                }
            }

            // Check for IPv4-mapped IPv6 addresses (e.g. ::ffff:7f00:1 → 127.0.0.1)
            // The URL parser serializes ::ffff:127.0.0.1 as ::ffff:7f00:1
            const mappedMatch = ipv6Hostname.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
            if (mappedMatch) {
                const high = parseInt(mappedMatch[1], 16);
                const low = parseInt(mappedMatch[2], 16);
                const ipv4 = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
                for (const pattern of PRIVATE_IPV4_PATTERNS) {
                    if (pattern.test(ipv4)) {
                        return true;
                    }
                }
            }

            return false;
        } catch {
            // If URL parsing fails, don't block (let other checks handle it)
            return false;
        }
    }

    private static getTopLevelBaseDomainFromBaseUrl(url: URL) {
        // Check if hostname is a local network name (no dots)
        if (!url.hostname.includes('.'))
          return url.hostname;

        const regex = /([^\s/$.?#]+\.[^\s/$.?#]+)$/g;
        const m = regex.exec(url.hostname);
        if (m && m[0]) return m[0];
        else {
            throw new Error(`LinkSanitizer: could not determine top level base domain from baseUrl hostname: ${url.hostname}`);
        }
    }

    /**
     * Prepends 'https://' to URLs that don't have a valid protocol.
     * Valid protocols are: relative paths, hash links, http://, https://, and hive://
     *
     * @param url - The URL string to check and potentially modify
     * @returns The URL string with 'https://' prepended if no valid protocol was found
     */
    private prependUnknownProtocolLink(url: string): string {
        if (!/^((#)|(\/(?!\/))|(((hive|https?):)?\/\/))/.test(url)) {
            url = 'https://' + url;
        }
        return url;
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
        if (url.indexOf('#') === 0) return false;
        url = url.toLowerCase();
        urlTitle = urlTitle.toLowerCase();

        try {
            const urlTitleContainsBaseDomain = urlTitle.indexOf(this.topLevelsBaseDomain) !== -1;
            const urlContainsBaseDomain = url.indexOf(this.topLevelsBaseDomain) !== -1;
            if (urlTitleContainsBaseDomain && !urlContainsBaseDomain) {
                return true;
            }
        } catch (error) {
            if (error instanceof TypeError) {
                return false; // if url is invalid it is ok
            } else throw error;
        }
        return false;
    }

    private validate(o: LinkSanitizerOptions) {
        ow(o, 'LinkSanitizerOptions', ow.object);
        ow(o.baseUrl, 'LinkSanitizerOptions.baseUrl', ow.string.nonEmpty);
    }
}
export interface LinkSanitizerOptions {
    baseUrl: string;
}
