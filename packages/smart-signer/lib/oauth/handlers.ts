/**
 * OAuth2 endpoint handlers for openhive.chat SSO.
 *
 * Flow:
 * 1. GET /api/oauth/authorize - Rocket.Chat redirects user here
 * 2. If not logged in, store OAuth state in session and redirect to /login
 * 3. After login, redirect back to /api/oauth/authorize
 * 4. Generate auth code, redirect to Rocket.Chat with code
 * 5. POST /api/oauth/token - Rocket.Chat exchanges code for access token
 * 6. GET /api/oauth/userinfo - Rocket.Chat fetches user profile
 */

import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { IronSessionData, OAuthState } from '@smart-signer/types/common';
import { siteConfig } from '@hive/ui/config/site';
import { getHiveUserProfile } from '@smart-signer/lib/get-hive-user-profile';
import { getLogger } from '@hive/ui/lib/logging';
import { proxifyImageSrc } from '@hive/ui/lib/proxify-images';

/** Strip HTML tags and limit length for plain-text profile fields. */
function sanitizeProfileText(value: string | undefined, maxLen = 160): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]*>/g, '').slice(0, maxLen).trim() || undefined;
}
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';
import {
  findClient,
  validateClientCredentials,
  validateRedirectUri,
} from './config';
import {
  createAuthorizationCode,
  createAccessToken,
  verifyJwt,
} from './jwt-utils';
import {
  authorizeParamsSchema,
  tokenBodySchema,
  parseBasicAuth,
  buildErrorRedirect,
  buildSuccessRedirect,
  OAUTH_ERRORS,
  OAuthError,
} from './validate';

const logger = getLogger('app');

// Default avatar hash from images.hive.blog (used when user has no profile_image)
const DEFAULT_AVATAR_HASH = 'DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4';

/**
 * GET /api/oauth/authorize
 *
 * Authorization endpoint. Validates request, checks user session,
 * and either redirects to login or issues authorization code.
 *
 * Flow:
 * 1. Initial request from Rocket.Chat: has query params, user not logged in
 *    -> Store params in session, redirect to /login
 * 2. Return from login: no query params, but session has OAuth state
 *    -> Use session state, generate code, redirect to client
 */
export const handleAuthorize: NextApiHandler = async (req, res) => {
  // Get user session first to check for stored OAuth state
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  const user = session.user;
  const storedOAuthState = session.oauthState;

  // Determine OAuth parameters - from query or from stored session state
  let clientId: string;
  let redirectUri: string;
  let scope: string;
  let state: string | undefined;

  // Check if this is a return from login (no query params, but session has state)
  const hasQueryParams = req.query.client_id && req.query.redirect_uri;

  if (!hasQueryParams && storedOAuthState) {
    // Returning from login - use stored session state
    logger.info('OAuth authorize: using stored session state for client %s', storedOAuthState.clientId);
    clientId = storedOAuthState.clientId;
    redirectUri = storedOAuthState.redirectUri;
    scope = storedOAuthState.scope || 'openid profile';
    state = storedOAuthState.state;
  } else {
    // Initial request - parse and validate query parameters
    const parseResult = authorizeParamsSchema.safeParse(req.query);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || 'Invalid request';
      logger.error('OAuth authorize validation failed: %s', errorMessage);
      res.status(400).json({
        error: OAUTH_ERRORS.INVALID_REQUEST,
        error_description: errorMessage,
      } satisfies OAuthError);
      return;
    }

    const params = parseResult.data;
    clientId = params.client_id;
    redirectUri = params.redirect_uri;
    scope = params.scope || 'openid profile';
    state = params.state;
  }

  // Validate client
  const client = findClient(clientId);
  if (!client) {
    logger.error('OAuth authorize: unknown client_id %s', clientId);
    res.status(400).json({
      error: OAUTH_ERRORS.UNAUTHORIZED_CLIENT,
      error_description: 'Unknown client_id',
    } satisfies OAuthError);
    return;
  }

  // Validate redirect_uri
  if (!validateRedirectUri(client, redirectUri)) {
    logger.error('OAuth authorize: invalid redirect_uri %s for client %s', redirectUri, clientId);
    res.status(400).json({
      error: OAUTH_ERRORS.INVALID_REQUEST,
      error_description: 'Invalid redirect_uri',
    } satisfies OAuthError);
    return;
  }

  // If user is not logged in, store OAuth state and redirect to login
  if (!user?.isLoggedIn || !user.username) {
    // Store OAuth state in session for after login
    const oauthState: OAuthState = {
      clientId,
      redirectUri,
      scope,
      state,
    };
    session.oauthState = oauthState;
    await session.save();

    // Redirect to login with return URL
    const loginUrl = new URL('/login', siteConfig.url);
    loginUrl.searchParams.set('oauth_return', 'true');
    res.redirect(302, loginUrl.toString());
    return;
  }

  // Check if user authenticated with strict mode (required for OAuth)
  if (!user.authenticateOnBackend) {
    logger.error('OAuth authorize: user %s not authenticated on backend', user.username);
    res.redirect(302, buildErrorRedirect(
      redirectUri,
      OAUTH_ERRORS.ACCESS_DENIED,
      'Backend authentication required for OAuth',
      state
    ));
    return;
  }

  // Generate authorization code
  const code = createAuthorizationCode(
    siteConfig.url,
    user.username,
    clientId,
    redirectUri,
    scope
  );

  // Clear OAuth state from session
  delete session.oauthState;
  await session.save();

  // Record consent
  if (!user.oauthConsent) {
    user.oauthConsent = {};
  }
  user.oauthConsent[clientId] = true;
  session.user = user;
  await session.save();

  logger.info('OAuth authorize: issued code for user %s to client %s', user.username, clientId);

  // Redirect to client with authorization code
  res.redirect(302, buildSuccessRedirect(redirectUri, code, state));
};

/**
 * POST /api/oauth/token
 *
 * Token endpoint. Exchanges authorization code for access token.
 */
export const handleToken: NextApiHandler = async (req, res) => {
  // Set response headers for token endpoint
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  // Parse client credentials from Basic auth or body
  let clientId: string | undefined;
  let clientSecret: string | undefined;

  const basicAuth = parseBasicAuth(req.headers.authorization);
  if (basicAuth) {
    clientId = basicAuth.clientId;
    clientSecret = basicAuth.clientSecret;
  }

  // Parse and validate body
  const parseResult = tokenBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    const errorMessage = parseResult.error.issues[0]?.message || 'Invalid request';
    logger.error('OAuth token validation failed: %s', errorMessage);
    res.status(400).json({
      error: OAUTH_ERRORS.INVALID_REQUEST,
      error_description: errorMessage,
    } satisfies OAuthError);
    return;
  }

  const body = parseResult.data;

  // Use body credentials if not in header
  if (!clientId) clientId = body.client_id;
  if (!clientSecret) clientSecret = body.client_secret;

  // Validate client credentials
  if (!clientId || !clientSecret) {
    res.status(401).json({
      error: OAUTH_ERRORS.INVALID_CLIENT,
      error_description: 'Client credentials required',
    } satisfies OAuthError);
    return;
  }

  const client = validateClientCredentials(clientId, clientSecret);
  if (!client) {
    logger.error('OAuth token: invalid client credentials for %s', clientId);
    res.status(401).json({
      error: OAUTH_ERRORS.INVALID_CLIENT,
      error_description: 'Invalid client credentials',
    } satisfies OAuthError);
    return;
  }

  // Verify and decode authorization code
  const codePayload = verifyJwt(body.code);
  if (!codePayload) {
    logger.error('OAuth token: invalid or expired code');
    res.status(400).json({
      error: OAUTH_ERRORS.INVALID_GRANT,
      error_description: 'Invalid or expired authorization code',
    } satisfies OAuthError);
    return;
  }

  // Validate code is for this client
  if (codePayload.aud !== clientId) {
    logger.error('OAuth token: code audience mismatch: %s vs %s', codePayload.aud, clientId);
    res.status(400).json({
      error: OAUTH_ERRORS.INVALID_GRANT,
      error_description: 'Authorization code was not issued to this client',
    } satisfies OAuthError);
    return;
  }

  // Validate code type
  if (codePayload.type !== 'code') {
    res.status(400).json({
      error: OAUTH_ERRORS.INVALID_GRANT,
      error_description: 'Invalid token type',
    } satisfies OAuthError);
    return;
  }

  // Validate redirect_uri matches
  if (codePayload.redirect_uri !== body.redirect_uri) {
    logger.error('OAuth token: redirect_uri mismatch');
    res.status(400).json({
      error: OAUTH_ERRORS.INVALID_GRANT,
      error_description: 'redirect_uri does not match',
    } satisfies OAuthError);
    return;
  }

  // Generate access token
  const accessToken = createAccessToken(
    siteConfig.url,
    codePayload.sub,
    clientId,
    codePayload.scope || 'openid profile'
  );

  logger.info('OAuth token: issued access token for user %s to client %s', codePayload.sub, clientId);

  // Return token response
  res.status(200).json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: codePayload.scope || 'openid profile',
  });
};

/**
 * GET /api/oauth/userinfo
 *
 * UserInfo endpoint. Returns user profile based on access token.
 */
export const handleUserInfo: NextApiHandler = async (req, res) => {
  // Extract Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Bearer token required',
    });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);

  if (!payload) {
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Invalid or expired access token',
    });
    return;
  }

  // Validate token type
  if (payload.type !== 'access') {
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Invalid token type',
    });
    return;
  }

  const username = payload.sub;

  // Fetch user profile from Hive blockchain
  const hiveProfile = await getHiveUserProfile(username);

  // Resolve picture URL through images.hive.blog proxy for consistent caching
  // - External URLs get proxified to /p/{b58hash}
  // - images.hive.blog URLs pass through unchanged
  // - No profile_image falls back to default avatar hash
  const pictureUrl = hiveProfile.picture
    ? hiveProfile.picture.startsWith(configuredImagesEndpoint)
      ? hiveProfile.picture // Already on images.hive.blog
      : proxifyImageSrc(hiveProfile.picture) // External URL - proxify it
    : `${configuredImagesEndpoint}/${DEFAULT_AVATAR_HASH}`; // Default avatar

  // Build userinfo response
  // Standard OIDC claims from Hive blockchain profile
  // Note: 'username' is included for Rocket.Chat compatibility (configured as username_field)
  const userinfo: Record<string, string | undefined> = {
    sub: username,
    username: username,
    preferred_username: username,
    name: sanitizeProfileText(hiveProfile.name, 100) || username,
    picture: pictureUrl,
  };

  // Add optional profile fields if available
  if (hiveProfile.website) {
    userinfo.website = sanitizeProfileText(hiveProfile.website, 200);
  }
  if (hiveProfile.about) {
    userinfo.about = sanitizeProfileText(hiveProfile.about);
  }
  if (hiveProfile.location) {
    userinfo.location = sanitizeProfileText(hiveProfile.location, 100);
  }

  logger.info('OAuth userinfo: returned profile for user %s', username);

  res.status(200).json(userinfo);
};

/**
 * Handle OAuth return after login.
 * Called by the login page when oauth_return=true is in query params.
 * Returns the authorize URL to redirect to after successful login.
 */
export const getOAuthReturnUrl = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> => {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  const oauthState = session.oauthState;

  if (!oauthState) {
    return null;
  }

  // Build the authorize URL to redirect back to
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
