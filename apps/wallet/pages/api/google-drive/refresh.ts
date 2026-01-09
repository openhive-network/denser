import type { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleDriveOAuth2Client } from './client';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('google-drive-auth');

type ResponseData = {
  accessToken?: string;
  error?: string;
};

/**
 * Proxy endpoint for exchanging Google Drive refresh token to new access token
 * Usage: POST /api/google-drive/refresh
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const refreshToken = req.body['refreshToken'];

    if (!refreshToken || typeof refreshToken !== 'string') {
      logger.debug('Received invalid Google Drive refresh token format');
      return res.status(400).json({ error: 'Invalid refresh token format' });
    }

    const oauth2Client = getGoogleDriveOAuth2Client();

    // Exchange authorization code for access and refresh tokens
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return res.status(200).json({
      accessToken: credentials.access_token!
    });
  } catch (error) {
    console.error('Error refreshing Google Drive access token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
