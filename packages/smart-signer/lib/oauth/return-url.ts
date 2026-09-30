import { siteConfig } from '@hive/ui/config/site';
import { OAuthState } from '@smart-signer/types/common';

/**
 * Build the authorize URL that resumes a pending OAuth2 request after sign-in,
 * from the state `/api/oauth/authorize` stored in the session.
 */
export const buildOAuthReturnUrl = (oauthState: OAuthState | undefined): string | null => {
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
