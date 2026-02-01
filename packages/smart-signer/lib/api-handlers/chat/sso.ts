import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { IronSessionData } from '@smart-signer/types/common';
import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@hive/ui/config/site';
import { getChatAuthToken } from '@smart-signer/lib/rocket-chat';

const logger = getLogger('app');

/**
 * SSO endpoint for Rocket.Chat iframe integration.
 *
 * This endpoint is called by Rocket.Chat when the iframe loads.
 * If user is logged into denser, we return a login token.
 * Otherwise, we return 401.
 *
 * See: https://docs.rocket.chat/docs/iframe-based-single-sign-on
 */
export const chatSso: NextApiHandler = async (req, res) => {
  logger.info('chatSso endpoint called, method=%s', req.method);

  // Set CORS headers for Rocket.Chat
  res.setHeader('Access-Control-Allow-Origin', siteConfig.openhiveChatUri);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let user;
  try {
    const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
    user = session.user;
    logger.info('chatSso session user: isLoggedIn=%s, username=%s', user?.isLoggedIn, user?.username);
  } catch (error) {
    logger.error(error, 'chatSso session error');
  }

  // Check if user is logged in
  if (!user?.isLoggedIn) {
    logger.info('chatSso: user not logged in, returning 401');
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // Check strict mode or allow non-strict
  if (!user.strict && !siteConfig.openhiveChatAllowNonStrictLogin) {
    logger.info('chatSso: user not in strict mode and non-strict not allowed');
    res.status(401).json({ error: 'Strict mode required' });
    return;
  }

  // Get or create Rocket.Chat login token
  try {
    const result = await getChatAuthToken(user.username);
    logger.info('chatSso getChatAuthToken result: success=%s', result.success);

    if (result.success) {
      // Return the token in the format RC expects
      res.status(200).json({ loginToken: result.data.authToken });
    } else {
      logger.warn('chatSso: failed to get chat token: %s', result.error);
      res.status(401).json({ error: result.error || 'Failed to get chat token' });
    }
  } catch (error) {
    logger.error(error, 'chatSso error getting chat token');
    res.status(500).json({ error: 'Internal server error' });
  }
};
