import { NextApiRequest, NextApiResponse } from 'next';
import { handleAuthorize } from '@smart-signer/lib/oauth/handlers';

/**
 * OAuth2 Authorization Endpoint
 *
 * GET /api/oauth/authorize
 *
 * Handles OAuth2 authorization requests from Rocket.Chat.
 * If user is not logged in, redirects to /login with oauth_return=true.
 * After login, issues authorization code and redirects back to client.
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

  await handleAuthorize(req, res);
}
