// This file is a wrapper with defaults to be used in both API routes
// and `getServerSideProps` functions.
import type { SessionOptions } from 'iron-session';
import env from '@beam-australia/react-env';

export const cookieNamePrefix = `${env('APP_NAME') || `app`}_`;

export const sessionOptions: SessionOptions = {
  password: process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD as string,
  cookieName: `${cookieNamePrefix}session`,
  // secure: true should be used in production (HTTPS) but can't be used
  // in development (HTTP)
  // sameSite: 'none' is required for cross-origin SSO (RC iframe calling /api/chat/sso)
  // This is safe because: httpOnly prevents JS access, secure ensures HTTPS only
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  },
};
