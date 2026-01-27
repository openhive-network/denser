/**
 * OAuth2 parameter validation utilities.
 */

import { z } from 'zod';

// Authorize endpoint query parameters
export const authorizeParamsSchema = z.object({
  response_type: z.literal('code', {
    errorMap: () => ({ message: 'Only response_type=code is supported' }),
  }),
  client_id: z.string().min(1, 'client_id is required'),
  redirect_uri: z.string().url('redirect_uri must be a valid URL'),
  scope: z.string().optional().default('openid profile'),
  state: z.string().optional(),
});

export type AuthorizeParams = z.infer<typeof authorizeParamsSchema>;

// Token endpoint body parameters
export const tokenBodySchema = z.object({
  grant_type: z.literal('authorization_code', {
    errorMap: () => ({ message: 'Only grant_type=authorization_code is supported' }),
  }),
  code: z.string().min(1, 'code is required'),
  redirect_uri: z.string().url('redirect_uri must be a valid URL'),
  client_id: z.string().optional(), // Can come from Basic auth
  client_secret: z.string().optional(), // Can come from Basic auth
});

export type TokenBody = z.infer<typeof tokenBodySchema>;

// OAuth2 error response format
export interface OAuthError {
  error: string;
  error_description?: string;
}

// Standard OAuth2 error codes
export const OAUTH_ERRORS = {
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  ACCESS_DENIED: 'access_denied',
  UNSUPPORTED_RESPONSE_TYPE: 'unsupported_response_type',
  INVALID_SCOPE: 'invalid_scope',
  SERVER_ERROR: 'server_error',
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
} as const;

/**
 * Build an OAuth2 error redirect URL.
 */
export const buildErrorRedirect = (
  redirectUri: string,
  error: string,
  errorDescription?: string,
  state?: string
): string => {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription);
  }
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
};

/**
 * Build an OAuth2 success redirect URL with authorization code.
 */
export const buildSuccessRedirect = (
  redirectUri: string,
  code: string,
  state?: string
): string => {
  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
};

/**
 * Parse Basic auth header for client credentials.
 * Format: "Basic base64(client_id:client_secret)"
 */
export const parseBasicAuth = (
  authHeader: string | undefined
): { clientId: string; clientSecret: string } | null => {
  if (!authHeader?.startsWith('Basic ')) return null;

  try {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;

    return {
      clientId: decodeURIComponent(decoded.slice(0, colonIndex)),
      clientSecret: decodeURIComponent(decoded.slice(colonIndex + 1)),
    };
  } catch {
    return null;
  }
};
