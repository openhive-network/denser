import BadDomains from '@hiveio/hivescript/bad-domains.json';
import GoodDomains from '@hiveio/hivescript/good-domains.json';

/**
 * Does this URL look like a phishing attempt?
 *
 * Use toLowerCase() instead of toLocaleLowerCase() for consistent behavior
 * regardless of server locale. toLocaleLowerCase() with Turkish locale
 * converts 'I' to 'ı' (dotless i), not 'i', which could allow phishing
 * domains to bypass detection.
 *
 * @param {string} questionableUrl
 * @returns {boolean}
 */
// eslint-disable-next-line import/prefer-default-export
export const looksPhishy = (questionableUrl: string) => {
  const lowercaseUrl = questionableUrl.toLowerCase();
  // eslint-disable-next-line no-restricted-syntax
  for (const domain of BadDomains) {
    if (lowercaseUrl.indexOf(domain) > -1) return true;
  }
  return false;
};

export const isUrlWhitelisted = (url: string) => {
  // Use toLowerCase() for consistent locale-independent behavior
  const cleanUrl = url.toLowerCase().replace(/^https?:\/\//, '');

  for (let di = 0; di < GoodDomains.length; di += 1) {
    const domain = GoodDomains[di].toLowerCase();

    if (cleanUrl.startsWith(domain)) {
      return true;
    }
  }

  return false;
};
