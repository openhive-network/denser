import type { NextRequest } from 'next/server';
import type { NextApiRequest } from 'next';

/**
 * Extract client IP address consistently across all middleware functions
 * Handles both NextRequest (Edge Runtime) and NextApiRequest (Node.js) objects
 *
 * In Next.js 15, NextRequest.ip was removed from types.
 * IP is now obtained from x-forwarded-for header or socket.
 */
export function getClientIp(req: NextRequest | NextApiRequest): string {
    // Handle NextApiRequest (Node.js)
    if ('socket' in req) {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            // x-forwarded-for can contain multiple IPs, take the first one
            return forwarded.split(',')[0].trim();
        }
        return (req.socket?.remoteAddress as string | undefined) || 'unknown';
    }

    // Handle NextRequest (Edge Runtime) - use headers
    if ('headers' in req && typeof req.headers.get === 'function') {
        const forwarded = req.headers.get('x-forwarded-for');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
    }

    return 'unknown';
}
