import { NextRequest, NextResponse } from 'next/server';

import { getGoogleDriveOAuth2Client } from '../client';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('google-drive-auth');

/**
 * Proxy endpoint for exchanging Google Drive refresh token to new access token
 * Usage: POST /api/google-drive/refresh
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => {});

    const refreshToken = body['refreshToken'];

    if (!refreshToken || typeof refreshToken !== 'string') {
      logger.debug('Received invalid Google Drive refresh token format');
      return new NextResponse(null, { status: 400 });
    }

    const oauth2Client = getGoogleDriveOAuth2Client();

    // Exchange authorization code for access and refresh tokens
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return NextResponse.json({
      accessToken: credentials.access_token
    }, { status: 200 });
  } catch (error) {
    console.error('Error refreshing Google Drive access token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
