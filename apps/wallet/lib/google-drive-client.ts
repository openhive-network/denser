import { google } from 'googleapis';

import { siteConfig } from "@hive/ui/config/site";

const CLIENT_ID = siteConfig.googleDrive.clientId;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const DEFAULT_REDIRECT_URI = siteConfig.googleDrive.redirectUri;

/**
 * Creates a Google OAuth2 client.
 * @param redirectUri - Optional custom redirect URI. If not provided, uses the default 'postmessage' for popup mode.
 *                      For Safari redirect flow, pass the callback URL (e.g., '/api/google-drive/callback').
 */
export const getGoogleDriveOAuth2Client = (redirectUri?: string) => {
  // Check is intentionally here, instead of at global scope, as Google Drive client may be optional in some deployments
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Google Drive OAuth2 client ID and secret must be set in environment variables.');
  }

  const uri = redirectUri || DEFAULT_REDIRECT_URI;
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, uri);

  return oauth2Client;
};
