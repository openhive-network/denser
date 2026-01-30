import { google } from 'googleapis';

import { siteConfig } from "@hive/ui/config/site";

const CLIENT_ID = siteConfig.googleDrive.clientId;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = siteConfig.googleDrive.redirectUri;

export const getGoogleDriveOAuth2Client = () => {
  // Check is intentionally here, instead of at global scope, as Google Drive client may be optional in some deployments
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Google Drive OAuth2 client ID and secret must be set in environment variables.');
  }

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  return oauth2Client;
};
