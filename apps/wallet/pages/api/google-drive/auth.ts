import type { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleDriveOAuth2Client } from './client';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('google-drive-auth');

type ResponseData = {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
};

/**
 * Proxy endpoint for google drive authentication
 * Usage: POST /api/google-drive/auth
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const code = req.body['code'];

    if (!code || typeof code !== 'string') {
      logger.debug('Received invalid Google Drive code format');
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // If the client signals redirect mode was used, construct the callback
    // URI from request headers instead of accepting a client-provided value
    let callbackUri: string | undefined;
    if (req.body['redirectUri']) {
      const host = req.headers['host'];
      const proto = req.headers['x-forwarded-proto'] || 'https';
      callbackUri = `${proto}://${host}/api/google-drive/callback`;
    }

    const oauth2Client = getGoogleDriveOAuth2Client(callbackUri);

    // Exchange authorization code for access and refresh tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Tokens consists of: access_token, refresh_token (only on first login), scope, expiry_date
    oauth2Client.setCredentials(tokens);

    return res.status(200).json({
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!, // May be undefined if the user logged in before and did not revoke consent
    });
  } catch (error) {
    logger.error('Error exchanging code for tokens: %s', error instanceof Error ? error.message : 'Unknown error');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
