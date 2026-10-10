import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@ui/lib/logging';
import { oidc } from '@smart-signer/lib/oidc';
import { logLogoutEvent, getClientIpFromApiRequest } from '@smart-signer/lib/event-logging';
import { clearAccountInfoCookie } from '@smart-signer/lib/account-info-cookie';

const logger = getLogger('app');

export const logoutUser: NextApiHandler<User> = async (req, res) => {
  checkCsrfHeader(req);

  if (oidc) {
    try {
      // Destroy oidc session
      const ctx = oidc.app.createContext(req, res);
      const oidcSession = await oidc.Session.get(ctx);
      if (oidcSession?.accountId) {
        logger.info('Logout: destroying oidc session for user: %s',
            oidcSession?.accountId);
        await oidcSession.destroy();
      }
    } catch (error) {
      logger.error('Logout: error when destroying oidc session: %s', error instanceof Error ? error.message : String(error));
    }
  }

  try {
    // Destroy app session
    const session = await getIronSession<IronSessionData>(
      req, res, sessionOptions
    );
    if (session) {
      // Log logout event BEFORE destroying session (need user data for log)
      const username = session.user?.username || 'unknown';
      const loginType = session.user?.loginType || 'unknown';
      const uid = req.cookies['session_uid'] || 'n/a';
      logLogoutEvent(getClientIpFromApiRequest(req), username, loginType, uid);

      logger.info('Logout: destroying app session for user: %s', username);
      session.destroy();
    }
  } catch (error) {
    logger.error('Logout: error when destroying app session: %s', error instanceof Error ? error.message : String(error));
  }

  // Mirrors iron-session destruction
  clearAccountInfoCookie(res);

  res.json(defaultUser);
};
