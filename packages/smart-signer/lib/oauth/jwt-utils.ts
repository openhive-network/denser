/**
 * JWT utilities for OAuth2 token generation and verification.
 *
 * Uses HS256 (HMAC-SHA256) for simplicity. The tokens are signed
 * with DENSER_SERVER_SECRET_COOKIE_PASSWORD.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { getJwtSecret, TOKEN_LIFETIME } from './config';

// Base64URL encoding (RFC 4648)
const base64UrlEncode = (data: string): string => {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const base64UrlDecode = (data: string): string => {
  // Restore standard base64
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
};

export interface JwtPayload {
  sub: string; // Hive username
  iss: string; // Issuer (site URL)
  aud: string; // Audience (client_id)
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  type: 'code' | 'access'; // Token type
  redirect_uri?: string; // For authorization code
  scope?: string; // Requested scopes
}

/**
 * Sign a JWT payload using HS256.
 */
export const signJwt = (payload: Omit<JwtPayload, 'iat'>): string => {
  const secret = getJwtSecret();

  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: JwtPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  const signature = createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signatureInput}.${signature}`;
};

/**
 * Verify and decode a JWT token.
 * Returns null if the token is invalid or expired.
 */
export const verifyJwt = (token: string): JwtPayload | null => {
  try {
    const secret = getJwtSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature using timing-safe comparison
    const signatureInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(signatureInput)
      .digest();
    const actualSignature = Uint8Array.from(Buffer.from(signatureB64, 'base64url'));

    if (expectedSignature.length !== actualSignature.length ||
        !timingSafeEqual(expectedSignature, actualSignature)) {
      return null;
    }

    // Decode payload
    const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadB64));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

/**
 * Create an authorization code (short-lived JWT).
 */
export const createAuthorizationCode = (
  issuer: string,
  username: string,
  clientId: string,
  redirectUri: string,
  scope: string
): string => {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    sub: username,
    iss: issuer,
    aud: clientId,
    exp: now + TOKEN_LIFETIME.AUTHORIZATION_CODE,
    type: 'code',
    redirect_uri: redirectUri,
    scope,
  });
};

/**
 * Create an access token (longer-lived JWT).
 */
export const createAccessToken = (
  issuer: string,
  username: string,
  clientId: string,
  scope: string
): string => {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    sub: username,
    iss: issuer,
    aud: clientId,
    exp: now + TOKEN_LIFETIME.ACCESS_TOKEN,
    type: 'access',
    scope,
  });
};
