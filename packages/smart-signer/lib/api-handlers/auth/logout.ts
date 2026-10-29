import type { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import type { IronSessionData } from '@smart-signer/types/common';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@ui/lib/logging';
import { oidc } from '@smart-signer/lib/oidc';
import { logLogoutEvent, getClientIpFromApiRequest } from '@smart-signer/lib/event-logging';
import { clearAccountInfoCookie } from '@smart-signer/lib/account-info-cookie';
import { endAllChatSessions } from '@smart-signer/lib/auth/chat-session';
import { chatSessionEnder } from '@smart-signer/lib/auth/chat-session-ender';
import type { SignOutAnswer } from '@smart-signer/lib/auth/chat-sign-out';

const logger = getLogger('app');

export const logoutUser: NextApiHandler<SignOutAnswer> = async (req, res) => {
  checkCsrfHeader(req);
  let chatSessionsEnded: Promise<boolean> = Promise.resolve(false);

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

      chatSessionsEnded = endAllChatSessions(session, chatSessionEnder());
      logger.info('Logout: destroying app session for user: %s', username);
      session.destroy();
    }
  } catch (error) {
    logger.error('Logout: error when destroying app session: %s', error instanceof Error ? error.message : String(error));
  }

  // Mirrors iron-session destruction
  clearAccountInfoCookie(res);

  // The browser's chat client signs its own device out when this does not say the server did
  res.json({ ...defaultUser, chatSessionsEnded: await chatSessionsEnded });
};
