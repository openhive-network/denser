// This file is a wrapper with defaults to be used in both API routes
// and `getServerSideProps` functions.
import type { SessionOptions } from 'iron-session';
import env from '@beam-australia/react-env';

// Ends in `_`: the shared HTML caches tell a signed-in request by a `*_session` cookie
const COOKIE_NAME_PREFIX_PATTERN = /^[A-Za-z0-9_-]*_$/;

/**
 * The prefix of the session and login challenge cookie names: DENSER_SERVER_SESSION_COOKIE_PREFIX,
 * or `${APP_NAME}_`. Apps served from one origin with the same prefix (and cookie password) share
 * one server session.
 */
function getCookieNamePrefix(): string {
  const configured = process.env.DENSER_SERVER_SESSION_COOKIE_PREFIX;
  if (!configured) return `${env('APP_NAME') || `app`}_`;
  if (!COOKIE_NAME_PREFIX_PATTERN.test(configured)) {
    throw new Error(
      `DENSER_SERVER_SESSION_COOKIE_PREFIX "${configured}" is not a cookie name prefix: letters, digits, "_" and "-", ending in "_"`
    );
  }
  return configured;
}

export const cookieNamePrefix = getCookieNamePrefix();

export const sessionOptions: SessionOptions = {
  password: process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD as string,
  cookieName: `${cookieNamePrefix}session`,
  // secure: true should be used in production (HTTPS) but can't be used
  // in development (HTTP)
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // Every app on the origin sends the cookie, so apps sharing the prefix share the session
    path: '/',
  },
};
