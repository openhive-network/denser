import { joinSiteUrl } from '@hive/ui/lib/site-url';
import type { IronSessionData } from '@smart-signer/types/common';

export const OAUTH_AUTHORIZE_PATH = '/api/oauth/authorize';

/**
 * Build the OAuth return URL from session state.
 * Used when user completes login and needs to return to OAuth flow.
 * @param siteUrl - The configured site URL (`siteConfig.url`), base path included
 */
export const buildOAuthReturnUrl = (
  oauthState: IronSessionData['oauthState'],
  siteUrl: string
): string | null => {
  if (!oauthState) return null;

  const authorizeUrl = joinSiteUrl(siteUrl, OAUTH_AUTHORIZE_PATH);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', oauthState.clientId);
  authorizeUrl.searchParams.set('redirect_uri', oauthState.redirectUri);
  if (oauthState.scope) {
    authorizeUrl.searchParams.set('scope', oauthState.scope);
  }
  if (oauthState.state) {
    authorizeUrl.searchParams.set('state', oauthState.state);
  }

  return authorizeUrl.toString();
};
