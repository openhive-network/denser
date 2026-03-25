import type { NextApiRequest } from 'next';

/**
 * Extract client IP from a Next.js API request (Node.js runtime).
 * For Edge Runtime (NextRequest), use getClientIp from @hive/middleware/lib/common-utils.
 */
export function getClientIpFromApiRequest(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Log a login event in structured plain-text format.
 * Called from the loginUser handler after session creation.
 */
export function logLoginEvent(
  ip: string | undefined,
  username: string,
  loginType: string,
  uuid: string
) {
  console.log(
    `ip=${ip} account=${username} login_type=${loginType} uuid=${uuid} LOGIN`
  );
}

/**
 * Log a logout event in structured plain-text format.
 * Called from the logoutUser handler before session destruction.
 */
export function logLogoutEvent(
  ip: string | undefined,
  username: string,
  loginType: string,
  uuid: string
) {
  console.log(
    `ip=${ip} account=${username} login_type=${loginType} uuid=${uuid} LOGOUT`
  );
}
