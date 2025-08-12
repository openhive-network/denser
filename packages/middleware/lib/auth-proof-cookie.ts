import { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest } from 'next/server';
import { createWaxFoundation, custom_json } from '@hiveio/wax';
import { getLogger } from '@ui/lib/logging';
import { logLoginEvent, logLogoutEvent } from '@ui/lib/logging';

export const AUTH_PROOF_COOKIE_NAME = 'auth_proof';

const wax = await createWaxFoundation();
const logger = getLogger('auth-proof-cookie');

// Simple rate limiting for page visit logging (prevent spam)
const pageVisitLogCache = new Map<string, number>();
const PAGE_VISIT_LOG_COOLDOWN = 30000; // 30 seconds between logs for same path (more aggressive)

// Clean up old entries from cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [path, timestamp] of pageVisitLogCache.entries()) {
        if (now - timestamp > PAGE_VISIT_LOG_COOLDOWN * 2) {
            pageVisitLogCache.delete(path);
        }
    }
}, 30000); // Clean up every 30 seconds

// Interface for the auth proof cookie data
export interface AuthProofCookieData {
    uuid: string; // loginChallenge
    username: string;
    loginType: string;
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
export async function parseAuthProofTransaction(authProof: string): Promise<{ loginChallenge: string; loginType: string } | null> {
    try {
        const tx = wax.convertTransactionFromBinaryForm(Buffer.from(authProof, 'base64').toString());
        const op = tx.operations[0].value as custom_json;

        // Extract loginChallenge from the custom_json operation
        const loginChallenge = JSON.parse(op.json);

        // Extract loginType from the operation ID (format: "denser_${loginType}")
        const loginType = op.id.replace('denser_', '');

        return { loginChallenge, loginType };
    } catch (error) {
        console.error('Error parsing auth proof transaction:', error);
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

        // Validate required fields
        if (parsed.uuid && parsed.username && parsed.loginType && parsed.authProof && parsed.timestamp) {
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
        `${AUTH_PROOF_COOKIE_NAME}=${cookieValue}; Path=/; SameSite=Lax; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''
        }` // No Max-Age = endless time
    ]);
}

/**
 * Clear the auth proof cookie (for logout)
 */
export function clearAuthProofCookie(res: NextApiResponse): void {
    res.setHeader('Set-Cookie', [
        `${AUTH_PROOF_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly`
    ]);
}

/**
 * Log a logout event and keep the auth proof cookie
 * @param req - The NextApiRequest object to get IP and user info
 * @param res - The NextApiResponse object to set cookies
 * @param username - The username of the user who logged out
 * @param loginType - The login type that was used
 * @param uuid - The UUID (loginChallenge) from the cookie
 */
export function logLogoutAndKeepCookie(
    req: NextApiRequest,
    _res: NextApiResponse,
    username: string,
    loginType: string,
    uuid: string
): void {
    // Log the logout event
    logLogoutEvent(
        req.socket.remoteAddress || req.headers['x-forwarded-for'] as string,
        username,
        loginType,
        uuid
    );
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
            logLoginEvent(
                req.socket.remoteAddress || req.headers['x-forwarded-for'] as string,
                username,
                loginType,
                loginChallenge
            );

            logger.info('Created new auth proof cookie for user: %s', username);
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
                    if (cookieData.username !== username || cookieData.loginType !== loginType || cookieData.authProof !== authProof) {
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
                        logLoginEvent(
                            req.socket.remoteAddress || req.headers['x-forwarded-for'] as string,
                            username,
                            loginType,
                            loginChallenge
                        );

                        logger.info('Updated auth proof cookie for user: %s (was: %s)', username, cookieData.username);
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
        // Skip logging for certain patterns to avoid spam
        if (shouldSkipPageVisitLogging(pathname)) {
            return;
        }
        
        // Rate limiting: don't log the same path multiple times in quick succession
        const now = Date.now();
        const lastLogTime = pageVisitLogCache.get(pathname);
        if (lastLogTime && (now - lastLogTime) < PAGE_VISIT_LOG_COOLDOWN) {
            return; // Skip logging, too soon
        }
        
        // Get the auth proof cookie
        const authCookie = req.cookies.get(AUTH_PROOF_COOKIE_NAME);
        
        if (authCookie) {
            // Parse the cookie to get user details
            const cookieData = parseAuthProofCookie(authCookie.value);
            
            if (cookieData) {
                // Get client IP
                const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
                
                // Log the page visit
                logger.info('Page visit: %s --> ip=%s account=%s login_type=%s uuid=%s', 
                    pathname, 
                    ip, 
                    cookieData.username, 
                    cookieData.loginType, 
                    cookieData.uuid
                );
                
                // Update the cache with current time
                pageVisitLogCache.set(pathname, now);
                
                // Debug: log the cache update
                logger.debug('Updated page visit cache for %s at %d', pathname, now);
            }
        }
    } catch (error) {
        // Silently fail - don't break the middleware if logging fails
        logger.debug('Failed to log page visit: %o', error);
    }
}

/**
 * Determine if we should skip logging for a given pathname
 * @param pathname - The page path being visited
 * @returns true if we should skip logging
 */
function shouldSkipPageVisitLogging(pathname: string): boolean {
    // Skip API routes
    if (pathname.startsWith('/api/')) {
        return true;
    }
    
    // Skip static files and Next.js internals
    if (pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
        return true;
    }
    
    // Skip favicon and other assets
    if (pathname === '/favicon.ico' || pathname.includes('.')) {
        return true;
    }
    
    // Don't skip any actual page routes we want to log them all!
    // The rate limiting will handle duplicate calls for the same route
    return false;
}
