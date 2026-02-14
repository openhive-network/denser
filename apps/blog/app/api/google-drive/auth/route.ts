import { NextRequest, NextResponse } from 'next/server';

import { getGoogleDriveOAuth2Client } from '../client';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('google-drive-auth');

/**
 * Proxy endpoint for google drive authentication
 * Usage: POST /api/google-drive/auth
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => {});

    const code = body['code'];

    if (!code || typeof code !== 'string') {
      logger.debug('Received invalid Google Drive code format');
      return new NextResponse(null, { status: 400 });
    }

    // If the client signals redirect mode was used, construct the callback
    // URI from request headers instead of accepting a client-provided value
    let callbackUri: string | undefined;
    if (body['redirectUri']) {
      const host = req.headers.get('host');
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      callbackUri = `${proto}://${host}/api/google-drive/callback`;
    }

    const oauth2Client = getGoogleDriveOAuth2Client(callbackUri);

    // Exchange authorization code for access and refresh tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Tokens consists of: access_token, refresh_token (only on first login), scope, expiry_date
    oauth2Client.setCredentials(tokens);

    return NextResponse.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token, // May be undefined if the user logged in before and did not revoke consent
    }, { status: 200 });
  } catch (error) {
    logger.error('Error exchanging code for tokens: %s', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
