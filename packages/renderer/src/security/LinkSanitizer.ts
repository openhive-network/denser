import ow from 'ow';
import {Log} from '../Log';
import {Phishing} from './Phishing';

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

        Log.log().debug('LinkSanitizer#sanitizeLink', {url, urlTitle});

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
        return url;
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
