import { NextApiRequest, NextApiResponse } from 'next';
import { handleToken } from '@smart-signer/lib/oauth/handlers';

/**
 * OAuth2 Token Endpoint
 *
 * POST /api/oauth/token
 *
 * Exchanges authorization code for access token.
 * Accepts client credentials via HTTP Basic auth or request body.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await handleToken(req, res);
}
