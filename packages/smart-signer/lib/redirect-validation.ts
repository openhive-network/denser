import { siteConfig } from '@ui/config/site';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

/**
 * Validates that a redirect URL is safe to use in the OIDC flow.
 *
 * This provides defense-in-depth protection against open redirect attacks.
 * While oidc-provider generates returnTo internally, we validate it to
 * protect against potential library bugs or unforeseen manipulation vectors.
 *
 * Valid redirects are:
 * - Relative URLs starting with the OIDC URL prefix (e.g., /oidc/auth/...)
 * - Absolute URLs with the same origin as the site
 *
 * @param redirectUrl - The URL to validate
 * @returns true if the redirect is safe, false otherwise
 */
export function isValidOidcRedirect(redirectUrl: string | undefined): boolean {
  if (!redirectUrl) {
    return false;
  }

  // Allow relative URLs starting with the OIDC prefix
  if (redirectUrl.startsWith(`${siteConfig.oidcUrlPrefix}/`)) {
    return true;
  }

  // For absolute URLs, verify same origin
  try {
    const redirect = new URL(redirectUrl, siteConfig.url);
    const site = new URL(siteConfig.url);

    if (redirect.origin === site.origin) {
      return true;
    }

    // Log rejected external redirects for security monitoring
    logger.warn(
      'Rejected OIDC redirect to external origin: %s (expected: %s)',
      redirect.origin,
      site.origin
    );
    return false;
  } catch (error) {
    logger.warn('Invalid OIDC redirect URL: %s', redirectUrl);
    return false;
  }
}

/**
 * Returns a safe redirect URL or undefined if the URL is invalid.
 * This is a convenience wrapper around isValidOidcRedirect.
 *
 * @param redirectUrl - The URL to validate
 * @returns The original URL if valid, undefined otherwise
 */
export function getSafeRedirectUrl(redirectUrl: string | undefined): string | undefined {
  if (isValidOidcRedirect(redirectUrl)) {
    return redirectUrl;
  }
  return undefined;
}
