import type { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleDriveOAuth2Client } from '@/wallet/lib/google-drive-client';
import { googleDriveTokenRequest } from '@/wallet/lib/google-drive-token-request';
import { answerGoogleDriveRefresh, type IGoogleDriveTokenAnswer } from '@smart-signer/lib/google-drive-token-request';

async function refreshAccessToken(refreshToken: string): Promise<string | null | undefined> {
  const oauth2Client = getGoogleDriveOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials.access_token;
}

/**
 * Proxy endpoint for exchanging Google Drive refresh token to new access token
 * Usage: POST /api/google-drive/refresh
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IGoogleDriveTokenAnswer['body']>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { status, body } = await answerGoogleDriveRefresh(
    await googleDriveTokenRequest(req, res),
    req.body,
    refreshAccessToken
  );
  return res.status(status).json(body);
}
