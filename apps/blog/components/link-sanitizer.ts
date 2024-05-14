import { looksPhishy } from '@ui/config/lists/phishing';
import ow from 'ow';
import { Log } from './log';

interface LinkSanitizerOptions {
  baseUrl: string;
}

interface SanitizeLinkResult {
  sanitizedUrl: string | false;
  logMessage: string;
}

export function createLinkSanitizer(options: LinkSanitizerOptions) {
  const baseUrl = new URL(options.baseUrl);
  const topLevelsBaseDomain = getTopLevelBaseDomainFromBaseUrl(baseUrl);

  function sanitizeLink(url: string, urlTitle: string): SanitizeLinkResult {
    let sanitizedUrl: string | false = prependUnknownProtocolLink(url);

    Log.log().debug('LinkSanitizer#sanitizeLink', { url: sanitizedUrl, urlTitle });

    if (looksPhishy(sanitizedUrl)) {
      Log.log().debug('LinkSanitizer#sanitizeLink', 'phishing link detected', 'phishing list', sanitizedUrl, {
        url: sanitizedUrl,
        urlTitle
      });
      sanitizedUrl = false;
    }

    if (isPseudoLocalUrl(sanitizedUrl, urlTitle)) {
      Log.log().debug(
        'LinkSanitizer#sanitizeLink',
        'phishing link detected',
        'pseudo local url',
        sanitizedUrl,
        {
          url: sanitizedUrl,
          urlTitle
        }
      );
      sanitizedUrl = false;
    }
    return { sanitizedUrl, logMessage: `Link sanitized: ${sanitizedUrl}` };
  }

  function getTopLevelBaseDomainFromBaseUrl(url: URL): string {
    const regex = /([^\s/$.?#]+\.[^\s/$.?#]+)$/g;
    const m = regex.exec(url.hostname);
    if (m && m[0]) return m[0];
    else {
      throw new Error(
        `LinkSanitizer: could not determine top level base domain from baseUrl hostname: ${url.hostname}`
      );
    }
  }

  function prependUnknownProtocolLink(url: string): string {
    if (!/^((#)|(\/(?!\/))|(((hive|https?):)?\/\/))/.test(url)) {
      url = 'https://' + url;
    }
    return url;
  }

  function isPseudoLocalUrl(url: string | false, urlTitle: string): boolean {
    if (!url || url.indexOf('#') === 0) return false;
    const lowerCaseUrl = url.toLowerCase();
    const lowerCaseUrlTitle = urlTitle.toLowerCase();

    try {
      const urlTitleContainsBaseDomain = lowerCaseUrlTitle.indexOf(topLevelsBaseDomain) !== -1;
      const urlContainsBaseDomain = lowerCaseUrl.indexOf(topLevelsBaseDomain) !== -1;
      return urlTitleContainsBaseDomain && !urlContainsBaseDomain;
    } catch (error) {
      if (error instanceof TypeError) {
        return false; // if url is invalid it is ok
      } else throw error;
    }
  }

  function validateOptions(o: LinkSanitizerOptions) {
    ow(o, 'LinkSanitizerOptions', ow.object);
    ow(o.baseUrl, 'LinkSanitizerOptions.baseUrl', ow.string.nonEmpty);
  }

  // Validate options when creating the LinkSanitizer
  validateOptions(options);

  return { sanitizeLink };
}
