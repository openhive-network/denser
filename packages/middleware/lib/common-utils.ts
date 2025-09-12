import type { NextRequest } from 'next/server';
import type { NextApiRequest } from 'next';

/**
 * Extract client IP address consistently across all middleware functions
 * Handles both NextRequest (Edge Runtime) and NextApiRequest (Node.js) objects
 */
export function getClientIp(req: NextRequest | NextApiRequest): string {
    // Handle NextRequest (Edge Runtime)
    if ('ip' in req && req.ip) {
        return req.ip;
    }

    // Handle NextApiRequest (Node.js)
    if ('socket' in req) {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            // x-forwarded-for can contain multiple IPs, take the first one
            return forwarded.split(',')[0].trim();
        }
        return req.socket?.remoteAddress || 'unknown';
    }

    // Fallback for NextRequest without ip property
    if ('headers' in req) {
        const forwarded = req.headers.get('x-forwarded-for');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
    }

    return 'unknown';
}
