import { NextApiRequest, NextApiResponse } from 'next';
import { handleUserInfo } from '@smart-signer/lib/oauth/handlers';

/**
 * OAuth2 UserInfo Endpoint
 *
 * GET /api/oauth/userinfo
 *
 * Returns user profile information based on access token.
 * Fetches profile data from Hive blockchain.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await handleUserInfo(req, res);
}
