import createHttpError from 'http-errors';
import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@hive/ui/config/site';
import { getChatAuthToken } from '@smart-signer/lib/rocket-chat';

const logger = getLogger('app');

/**
 * Create a new auth token in Rocket Chat and return it in User object.
 *
 * @param {*} req
 * @param {*} res
 */
export const getChatToken: NextApiHandler<User> = async (req, res) => {
  checkCsrfHeader(req);

  let user: User | undefined;
  try {
    const session = await getIronSession<IronSessionData>(
      req, res, sessionOptions
    );
    user = session.user;
  } catch (error) {
    logger.error('getChatToken error:', error);
  }

  if (!(
    user?.isLoggedIn
    && user.username
    && user.strict
    && user.oauthConsent?.[siteConfig.openhiveChatClientId]
  )) {
    throw new createHttpError.Unauthorized();
  }


  let chatAuthToken = '';
  if (siteConfig.openhiveChatIframeIntegrationEnable) {
    const result = await getChatAuthToken(user.username);
    if (result.success) {
      chatAuthToken = result.data.authToken;
    }
  }

  user = {
    ...user,
    chatAuthToken,
  };
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();
  res.json(user);
};
