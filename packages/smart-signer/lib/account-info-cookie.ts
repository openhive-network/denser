import type { NextApiResponse } from 'next';

function appendSetCookie(res: NextApiResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie') || [];
  const cookies = Array.isArray(existing) ? existing : [String(existing)];
  cookies.push(cookie);
  res.setHeader('Set-Cookie', cookies);
}

/**
 * Set the `account_info` cookie the Edge middleware reads for page visit logging. It mirrors the
 * identity in iron-session in a form readable without decryption, so set it only after the
 * session holds a verified user. Session cookie (no Max-Age) to match iron-session.
 */
export function setAccountInfoCookie(res: NextApiResponse, username: string, loginType: string): void {
  const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendSetCookie(res, `account_info=${username}:${loginType}; Path=/; HttpOnly; SameSite=Lax${securePart}`);
}

export function clearAccountInfoCookie(res: NextApiResponse): void {
  const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendSetCookie(res, `account_info=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${securePart}`);
}
