import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import type { IronSessionData, User } from '@smart-signer/types/common';
import type { IGoogleDriveTokenRequest } from '@smart-signer/lib/google-drive-token-request';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('google-drive-auth');

async function sessionUser(req: NextApiRequest, res: NextApiResponse): Promise<User | undefined> {
  try {
    const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
    return session.user;
  } catch (error) {
    logger.error(error, 'Error reading the server session of a Google Drive token request');
    return undefined;
  }
}

/** What the Google Drive token routes check of `req` before they use the app's Google client */
export async function googleDriveTokenRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<IGoogleDriveTokenRequest> {
  return { headers: req.headers, cookies: req.cookies, user: await sessionUser(req, res) };
}
