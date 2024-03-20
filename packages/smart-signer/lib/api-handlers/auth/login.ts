import createHttpError from 'http-errors';
import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { oidc } from '@smart-signer/lib/oidc';
import { sessionOptions } from '@smart-signer/lib/session';
import { getAccount } from '@transaction/lib/hive';
import { postLoginSchema, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { verifyLoginChallenge } from '@smart-signer/lib/verify-login-challenge';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');


export const loginUser: NextApiHandler<User> = async (req, res) => {
  checkCsrfHeader(req);

  const { slug } = req.query;
  // try {
  //   if (slug) {
  //     const {
  //       uid, prompt, params, session, returnTo,
  //     } = await oidc.interactionDetails(req, res);
  //     logger.info('api loginUser: %o', {
  //       slug, uid, prompt, params, session, returnTo,
  //     });
  //   } else {
  //     logger.info('api loginUser: no slug');
  //   }
  // } catch(e) {
  //   // throw e;
  //   logger.error(e);
  // }

  const data: PostLoginSchema = await postLoginSchema.parseAsync(req.body);
  const { username, loginType, signatures, keyType } = data;
  let hiveUserProfile;
  let chainAccount;
  try {
    chainAccount = await getAccount(username);
    if (!chainAccount) {
      throw new Error(`Missing blockchain account "${username}"`);
    }
    hiveUserProfile = chainAccount?.profile;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Missing blockchain account')) {
        throw new createHttpError.NotFound(`Hive user ${username} not found`);
      }
    }
    throw error;
  }

  const loginChallenge = req.cookies[`${cookieNamePrefix}login_challenge_server`] || '';

  const result = verifyLoginChallenge(
    chainAccount,
    signatures,
    JSON.stringify({ loginChallenge })
  );

  if (!result) {
    if (slug) {
      const oidcResult = {
        error: 'access_denied',
        error_description: 'Username or password is incorrect.'
      };
      // redirect('oidc/auth/' + slug[0]);
      try {
        return await oidc.interactionFinished(req, res, oidcResult, {
          mergeWithLastSubmission: false
        });
      } catch (e) {
        logger.error(e);
      }
    }
    throw new createHttpError.Unauthorized('Invalid username or password');
  }

  const auth = { posting: result };
  // if (ctx.session.a === account) loginType = 'resume';
  // if (auth.posting) ctx.session.a = account;

  const user: User = {
    isLoggedIn: true,
    username,
    avatarUrl: hiveUserProfile?.profile_image || '',
    loginType,
    keyType
  };
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();
  res.json(user);
};
