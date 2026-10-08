import { siteConfig } from '@hive/ui/config/site';
import { IronSessionData } from '@smart-signer/types/common';

/**
 * Build the OAuth return URL from session state.
 * Used when user completes login and needs to return to OAuth flow.
 */
export const buildOAuthReturnUrl = (oauthState: IronSessionData['oauthState']): string | null => {
  if (!oauthState) return null;

  const authorizeUrl = new URL('/api/oauth/authorize', siteConfig.url);
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
