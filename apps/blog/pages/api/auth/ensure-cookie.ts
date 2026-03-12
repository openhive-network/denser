import type { NextApiRequest, NextApiResponse } from 'next';
import {
  AUTH_PROOF_COOKIE_NAME,
  parseAuthProofCookie,
  setAuthProofCookie
} from '@hive/middleware/lib/auth-proof-cookie';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';

/**
 * Lightweight endpoint to ensure the auth_proof cookie exists.
 *
 * Called by AuthCookieRecovery when the client detects a logged-in user
 * (via localStorage) but the HttpOnly cookie is missing — typically after
 * the browser cleared session cookies.
 *
 * Sets a minimal cookie with just the username so SSR can identify the
 * observer. Does NOT require authProof or signing.
 *
 * This cookie is used solely for SSR observer selection (which content
 * to gray), not for authentication or authorization.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  checkCsrfHeader(req);

  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Missing username' });
  }

  // Validate username format (same as log-account-handler)
  if (username.length === 0 || username.length > 16 || !/^[a-z0-9.-]+$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  // Check if cookie already exists with matching username
  const existingCookie = req.cookies[AUTH_PROOF_COOKIE_NAME];
  if (existingCookie) {
    try {
      const existingData = parseAuthProofCookie(existingCookie);
      if (existingData?.username === username) {
        return res.status(200).json({ success: true, action: 'already_set' });
      }
    } catch {
      // Invalid cookie, will be replaced
    }
  }

  // Set a minimal auth_proof cookie for SSR observer detection
  setAuthProofCookie(res, {
    uuid: { challenge: 'recovery' },
    username,
    loginType: null,
    authProof: '',
    timestamp: Date.now()
  });

  res.status(200).json({ success: true, action: 'cookie_set' });
}
