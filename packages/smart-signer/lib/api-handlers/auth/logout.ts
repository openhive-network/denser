import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@ui/lib/logging';
import { oidc } from '@smart-signer/lib/oidc';

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
      logger.error('Logout: error when destroying oidc session: %o', error);
    }
  }

  try {
    // Destroy app session
    const session = await getIronSession<IronSessionData>(
      req, res, sessionOptions
    );
    if (session) {
      logger.info('Logout: destroying app session for user: %s',
          session.user?.username);
      session.destroy();
    }
  } catch (error) {
    logger.error('Logout: error when destroying app session: %o', error);
  }

  res.json(defaultUser);
};
