import { NextRequest, NextResponse } from 'next/server';

import { answerGoogleDriveRefresh } from '@smart-signer/lib/google-drive-token-request';
import { getGoogleDriveOAuth2Client } from '../client';
import { googleDriveTokenRequest } from '../token-request';

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
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json().catch(() => undefined);
  const { status, body: answer } = await answerGoogleDriveRefresh(
    await googleDriveTokenRequest(req),
    body,
    refreshAccessToken
  );
  return NextResponse.json(answer, { status });
}
