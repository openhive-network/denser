// This file is a wrapper with defaults to be used in both API routes
// and `getServerSideProps` functions.
import type { SessionOptions } from 'iron-session';

export const sessionOptions: SessionOptions = {
  password: process.env.DENSER_SERVER_SECRET_COOKIE_PASSWORD as string,
  cookieName: 'iron-session/apps/auth',
  // secure: true should be used in production (HTTPS) but can't be used
  // in development (HTTP)
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
}
