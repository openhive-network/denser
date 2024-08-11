import createHttpError from 'http-errors';
import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { getAccount } from '@transaction/lib/hive';
import { postLoginSchema, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { verifyLoginChallenge } from '@smart-signer/lib/verify-login-challenge';
import { verifyLogin } from '@smart-signer/lib/verify-login';
import { getLoginChallengeFromTransactionForLogin } from '@smart-signer/lib/login-operation'
import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@hive/ui/config/site';
import { getChatAuthToken } from '@smart-signer/lib/rocket-chat';

const logger = getLogger('app');


export const getToken: NextApiHandler<{ chatAuthToken: string; }> = async (req, res) => {
  checkCsrfHeader(req);

  let user: User | undefined;
  try {
    const session = await getIronSession<IronSessionData>(
      req, res, sessionOptions
    );
    user = session.user;
  } catch (error) {
    logger.error('getToken error:', error);
  }

  if (!(user?.isLoggedIn && user.username)) {
    throw new createHttpError.Unauthorized();
  }


  let chatAuthToken = '';
  if (siteConfig.openhiveChatIframeIntegrationEnable) {
    const result = await getChatAuthToken(user.username);
    logger.info('bamboo result: %o', result);
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
  res.json({ chatAuthToken });
};
