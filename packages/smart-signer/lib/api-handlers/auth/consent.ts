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
import { postConsentSchema, PostConsentSchema } from '@smart-signer/lib/auth/utils';

const logger = getLogger('app');


/**
 * Register in session user consent in Oauth flow.
 *
 * @param {*} req
 * @param {*} res
 */
export const registerConsent: NextApiHandler<User> = async (req, res) => {
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

  const data: PostConsentSchema = await postConsentSchema.parseAsync(req.body);
  user.oauthConsent[data.oauthClientId] = data.consent;

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();
  res.json(user);
};
