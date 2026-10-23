/**
 * OAuth2 configuration for chat SSO integration.
 *
 * This is a minimal OAuth2 authorization server implementation for
 * Rocket.Chat (openhive.chat) and Matrix (Synapse) SSO using Hive
 * blockchain authentication.
 */

import { timingSafeEqual } from 'crypto';

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  clientName: string;
}

// OAuth2 token lifetimes (in seconds)
export const TOKEN_LIFETIME = {
  AUTHORIZATION_CODE: 60, // 1 minute
  ACCESS_TOKEN: 3600, // 1 hour
} as const;

// JWT configuration
const JWT_SECRET = process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD;
if (!JWT_SECRET && typeof window === 'undefined') {
  // Only warn on server-side, not during client-side builds
  console.warn('DENSER_SERVER_SECRET_COOKIE_PASSWORD not set - OAuth2 will not work');
}
export const getJwtSecret = (): string => {
  const secret = process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD;
  if (!secret) {
    throw new Error('DENSER_SERVER_SECRET_COOKIE_PASSWORD environment variable is required');
  }
  return secret;
};

// OAuth2 clients configuration
const OPENHIVE_CHAT_SECRET = process.env.DENSER_SERVER_OAUTH_OPENHIVE_CHAT_SECRET;

const MATRIX_CLIENT_ID = 'matrix';
// Where Synapse's OIDC provider receives the authorization code
const SYNAPSE_OIDC_CALLBACK_PATH = '/_synapse/client/oidc/callback';

/** The explicit redirect URI, or the homeserver's OIDC callback; undefined when neither is set. */
function matrixRedirectUri(): string | undefined {
  const explicit = process.env.DENSER_SERVER_OAUTH_MATRIX_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const homeserver = process.env.REACT_APP_MATRIX_HOMESERVER_URL?.trim().replace(/\/+$/, '');
  return homeserver ? `${homeserver}${SYNAPSE_OIDC_CALLBACK_PATH}` : undefined;
}

function matrixClient(): OAuthClient | undefined {
  const clientSecret = process.env.DENSER_SERVER_OAUTH_MATRIX_SECRET;
  const redirectUri = matrixRedirectUri();
  if (!clientSecret || !redirectUri) return undefined;
  return {
    clientId: MATRIX_CLIENT_ID,
    clientSecret,
    redirectUris: [redirectUri],
    clientName: 'Matrix',
  };
}

export const getOAuthClients = (): OAuthClient[] => {
  const clients: OAuthClient[] = [];

  if (OPENHIVE_CHAT_SECRET) {
    clients.push({
      clientId: 'denser',
      clientSecret: OPENHIVE_CHAT_SECRET,
      redirectUris: [
        'https://openhive.chat/_oauth/denser',
      ],
      clientName: 'Denser',
    });
  }

  const matrix = matrixClient();
  if (matrix) clients.push(matrix);

  return clients;
};

export const findClient = (clientId: string): OAuthClient | undefined => {
  return getOAuthClients().find((c) => c.clientId === clientId);
};

export const validateClientCredentials = (
  clientId: string,
  clientSecret: string
): OAuthClient | null => {
  const client = findClient(clientId);
  if (!client) return null;
  const expected = Buffer.from(client.clientSecret);
  const actual = Buffer.from(clientSecret);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return client;
};

export const validateRedirectUri = (
  client: OAuthClient,
  redirectUri: string
): boolean => {
  return client.redirectUris.includes(redirectUri);
};
