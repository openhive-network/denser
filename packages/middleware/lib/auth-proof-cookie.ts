import { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import { getLogger } from '@ui/lib/logging';
import { getClientIp } from './common-utils';

export const AUTH_PROOF_COOKIE_NAME = 'auth_proof';

const logger = getLogger('auth-proof-cookie');

// Conditional WASM loading - only load when available (Node.js), skip in Edge Runtime
let wax: any = null;
let custom_json: any = null;

// Initialize WASM modules when needed (not at top level)
async function initializeWasm() {
  if (wax && custom_json) return; // Already initialized

  try {
    // Dynamic import to avoid Edge Runtime issues
    const waxModule = await import('@hiveio/wax');// XXX: Analyze if we can somehow move this import to common-hiveio-packages
    wax = await waxModule.createHiveChain();
    custom_json = waxModule.custom_json;
    logger.debug('WASM authProofLoggermodules loaded successfully');
  } catch (error) {
    logger.debug('WASM modules not available (likely Edge Runtime):', error);
    // Continue without WASM - functions will handle this gracefully
  }
}

// Interface for the auth proof cookie data
export interface AuthProofCookieData {
  uuid: string;
  username: string | null;
  loginType: string | null;
  authProof: string;
  timestamp: number;
}

// Interface for the request body
interface AuthRequestBody {
  username: string;
  loginType: string;
  loginChallenge: string;
  authProof: string;
}

/**
 * Parse authProof transaction to extract loginChallenge and loginType
 */
export async function parseAuthProofTransaction(
  authProof: string
): Promise<{ loginChallenge: string; loginType: string } | null> {
  try {
    // Initialize WASM if not already done
    await initializeWasm();

    // Check if WASM is available
    if (!wax || !custom_json) {
      logger.debug('WASM not available, cannot parse auth proof transaction');
      return null;
    }

    const tx = wax.convertTransactionFromBinaryForm(Buffer.from(authProof, 'base64').toString());
    const op = tx.operations[0].value as typeof custom_json;

    // Extract loginChallenge from the custom_json operation
    const loginChallenge = JSON.parse(op.json);

    // Extract loginType from the operation ID (format: "denser_${loginType}")
    const loginType = op.id.replace('denser_', '');

    return { loginChallenge, loginType };
  } catch (error) {
    logger.error('Error parsing auth proof transaction: %o', error);
    return null;
  }
}

/**
 * Parse the auth proof cookie string into structured data
 */
export function parseAuthProofCookie(cookieValue: string): AuthProofCookieData | null {
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    // Validate required fields (username and loginType can be null for logged out users)
    if (parsed.uuid && parsed.timestamp !== undefined) {
      return parsed as AuthProofCookieData;
    }

    return null;
  } catch (error) {
    logger.error('Failed to parse auth proof cookie: %o', error);
    return null;
  }
}

/**
 * Set the auth proof cookie in the response
 */
export function setAuthProofCookie(res: NextApiResponse, data: AuthProofCookieData): void {
  const cookieValue = Buffer.from(JSON.stringify(data)).toString('base64');

  res.setHeader('Set-Cookie', [
    `${AUTH_PROOF_COOKIE_NAME}=${cookieValue}; Path=/; SameSite=Lax; HttpOnly; ${
      process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    }` // No Max-Age = endless time
  ]);
}

/**
 * Clear the auth proof cookie (for logout)
 */
export function clearAuthProofCookie(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', [`${AUTH_PROOF_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly`]);
}

/**
 * Log logout event and keep the cookie (for IP/browser tracking)
 */
export function logLogoutAndKeepCookie(
  req: NextApiRequest,
  res: NextApiResponse,
  username: string,
  loginType: string,
  uuid: string,
  ip: string
): void {
  // Log the logout event
  logLogoutEvent(ip, username, loginType, uuid);

  // Update the cookie to set username and login_type to null, but keep uuid and other fields
  const existingCookie = req.cookies[AUTH_PROOF_COOKIE_NAME];
  if (existingCookie) {
    try {
      const cookieData = parseAuthProofCookie(existingCookie);
      if (cookieData) {
        // Create updated cookie data with null username and login_type
        const updatedCookieData: AuthProofCookieData = {
          ...cookieData,
          username: null,
          loginType: null
        };

        // Set the updated cookie
        setAuthProofCookie(res, updatedCookieData);
        logger.debug('Updated auth proof cookie with null username/login_type for logged out user');
      }
    } catch (error) {
      logger.debug('Failed to update cookie on logout:', error);
    }
  }
}

export async function validateAndGetAuthProofCookie(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthProofCookieData | null> {
  // get auth proof cookie from request
  let cookie = req.cookies[AUTH_PROOF_COOKIE_NAME];
  let cookieData: AuthProofCookieData | null = null;

  // if cookie is not set, build it and set it in response
  if (!cookie) {
    // build auth proof cookie
    const { username, loginType, loginChallenge, authProof } = req.body as AuthRequestBody;

    if (username && loginType && loginChallenge && authProof) {
      cookieData = {
        uuid: loginChallenge,
        username,
        loginType,
        authProof,
        timestamp: Date.now()
      };

      // set cookie in response
      setAuthProofCookie(res, cookieData);

      // log login event
      logLoginEvent(getClientIp(req), username, loginType, loginChallenge);
    }
  } else {
    try {
      // parse existing cookie
      cookieData = parseAuthProofCookie(cookie);

      if (cookieData) {
        // check if new auth proof is different from the one in the cookie
        const { username, loginType, loginChallenge, authProof } = req.body as AuthRequestBody;

        if (username && loginType && loginChallenge && authProof) {
          // keep same uuid, but change user and login type if different
          if (
            cookieData.username !== username ||
            cookieData.loginType !== loginType ||
            cookieData.authProof !== authProof
          ) {
            // if different, set new cookie in response
            cookieData = {
              uuid: loginChallenge, // use new loginChallenge as UUID
              username,
              loginType,
              authProof,
              timestamp: Date.now()
            };

            setAuthProofCookie(res, cookieData);

            // log login change event
            logLoginEvent(getClientIp(req), username, loginType, loginChallenge);
          }
          // if same, keep same cookie
        }
      }
    } catch (error) {
      logger.error('Error parsing auth proof cookie: %o', error);
      cookieData = null;
    }
  }

  // return cookie data
  return cookieData;
}

/**
 * Log a page visit event using data from the auth proof cookie
 * Only logs main page visits, not internal navigation or API calls
 * @param req - The NextRequest object to get IP and pathname
 * @param pathname - The page path being visited
 */
export function logPageVisit(req: NextRequest, pathname: string): void {
  try {
    // Safety check - ensure pathname is valid
    if (!pathname || typeof pathname !== 'string') {
      return;
    }

    // Skip logging for certain patterns to avoid spam
    if (shouldSkipPageVisitLogging(pathname)) {
      return;
    }

    // Get client IP
    const ip = getClientIp(req);

    // Get the auth proof cookie
    const authCookie = req.cookies.get(AUTH_PROOF_COOKIE_NAME);

    if (authCookie) {
      // Parse the cookie to get user details
      const cookieData = parseAuthProofCookie(authCookie.value);

      if (cookieData) {
        // Handle null values for logged out users
        const username = cookieData.username || 'n/a';
        const loginType = cookieData.loginType || 'n/a';

        // Log the page visit with cookie data
        console.log(
          `Page visit: ${pathname} --> ip=${ip} account=${username} login_type=${loginType} uuid=${cookieData.uuid}`
        );
      } else {
        // Cookie exists but is invalid - log with defaults
        console.log(
          `Page visit: ${pathname} --> ip=${ip} account=n/a login_type=n/a uuid=n/a`
        );
      }
    } else {
      // No cookie - user is not logged in, log with defaults
      console.log(
        `Page visit: ${pathname} --> ip=${ip} account=n/a login_type=n/a uuid=n/a`
      );
    }
  } catch (error) {
    // Silently fail - don't break the middleware if logging fails
    logger.debug('Failed to log page visit: %o', error);
  }
}

/**
 * Check if page visit logging should be skipped
 */
function shouldSkipPageVisitLogging(pathname: string): boolean {
  // Skip API routes
  if (pathname.startsWith('/api/')) {
    return true;
  }

  // Skip Next.js internals and error pages
  if (pathname.startsWith('/_next/') || pathname.startsWith('/__nextjs_')) {
    return true;
  }

  // Skip static files by specific extensions
  const staticFileExtensions = [
    '.js',
    '.css',
    '.ico',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.txt',
    '.xml',
    '.json',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.map',
    '.pdf',
    '.zip',
    '.mp4',
    '.mp3',
    '.wav',
    '.wasm'
  ];

  if (staticFileExtensions.some((ext) => pathname.toLowerCase().endsWith(ext))) {
    return true;
  }

  // Skip other common static patterns
  if (pathname.startsWith('/static/') || pathname.startsWith('/assets/') || pathname.startsWith('/public/')) {
    return true;
  }

  // Log actual page routes only (no file extensions or static paths)
  return false;
}

/**
 * Log a login event in plain text format like page visits
 * @param ip - The user's IP address
 * @param username - The username who logged in
 * @param loginType - The login type used
 * @param loginChallenge - The UUID from the login challenge
 */
export function logLoginEvent(
  ip: string | undefined,
  username: string,
  loginType: string,
  loginChallenge: string
) {
  console.log(
    `Account login: ${username} --> ip=${ip} account=${username} login_type=${loginType} uuid=${loginChallenge}`
  );
}

/**
 * Log a logout event in plain text format like page visits
 * @param ip - The user's IP address
 * @param username - The username of the user who logged out
 * @param loginType - The login type that was used
 * @param uuid - The UUID (loginChallenge) from the cookie
 */
export function logLogoutEvent(ip: string | undefined, username: string, loginType: string, uuid: string) {
  console.log(
    `Account logout: ${username} --> ip=${ip} account=${username} login_type=${loginType} uuid=${uuid}`
  );
}
