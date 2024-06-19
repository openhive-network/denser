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
import { verifyLogin } from '@smart-signer/lib/verify-login';
import { getLoginChallengeFromTransactionForLogin } from '@smart-signer/lib/login-operation'
import assert from 'node:assert';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');


export const loginUser: NextApiHandler<User> = async (req, res) => {
  checkCsrfHeader(req);

  // Validate if there's oidc session for given slug and if prompt.name
  // is correct. Throw error if not.
  const { slug } = req.query;
  if (slug) {
    try {
      const { prompt: { name } } = await oidc.interactionDetails(req, res);
      assert.strictEqual(name, 'login');
    } catch (error) {
      logger.error(error);
      throw new createHttpError.BadRequest();
    }
  }

  const loginChallenge = req.cookies[`${cookieNamePrefix}login_challenge_server`] || '';

  const data: PostLoginSchema = await postLoginSchema.parseAsync(req.body);
  const { username, loginType, signatures, keyType, authenticateOnBackend } = data;
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

  let result: boolean = false;

  if (JSON.parse(data.txJSON)) {
    // Check whether loginChallenge is correct.
    const reguestLoginChallenge =
      getLoginChallengeFromTransactionForLogin(JSON.parse(data.txJSON), keyType);
    if (reguestLoginChallenge !== loginChallenge) {
      throw new createHttpError[401]('Invalid login challenge');
    }

    // Verify signature in passed transaction.
    try {
      result = !!(await verifyLogin(data));
    } catch (error) {
      // swallow error
    }
  } else {
    result = verifyLoginChallenge(
      chainAccount,
      signatures,
      JSON.stringify({ loginChallenge })
    );
  }

  if (!result) {
    if (slug) {
      const oidcResult = {
        error: 'access_denied',
        error_description: 'Username or password is incorrect.'
      };
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

  const user: User = {
    isLoggedIn: true,
    username,
    avatarUrl: hiveUserProfile?.profile_image || '',
    loginType,
    keyType,
    authenticateOnBackend
  };
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();

  if (slug) {
    return await oidc.interactionFinished(req, res,
      {
        login: {
          accountId: user.username,
        },
      },
      { mergeWithLastSubmission: false }
    );
  } else {
    res.json(user);
  }
};
