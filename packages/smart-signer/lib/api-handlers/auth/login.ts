import createHttpError from 'http-errors';
import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { getAccount } from '@transaction/lib/hive-api';
import { getChain } from '@transaction/lib/chain';
import { postLoginSchema, PostLoginSchema } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { verifyLoginChallenge } from '@smart-signer/lib/verify-login-challenge';
import { verifyLogin } from '@smart-signer/lib/verify-login';
import { getLoginChallengeFromTransactionForLogin } from '@smart-signer/lib/login-operation';
import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@hive/ui/config/site';
import { getChatAuthToken } from '@smart-signer/lib/rocket-chat';
import { logLoginEvent, getClientIpFromApiRequest } from '@smart-signer/lib/event-logging';

const logger = getLogger('app');

export const loginUser: NextApiHandler<User> = async (req, res) => {
  checkCsrfHeader(req);

  const loginChallenge = req.cookies[`${cookieNamePrefix}login_challenge_server`] || '';

  const data: PostLoginSchema = await postLoginSchema.parseAsync(req.body);

  const { username, loginType, signatures, keyType, authenticateOnBackend, strict } = data;
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
  let verifiedUser: User | undefined;

  if (JSON.parse(data.txJSON)) {
    const parsedTx = JSON.parse(data.txJSON);

    // Check whether loginChallenge is correct.
    const reguestLoginChallenge = getLoginChallengeFromTransactionForLogin(parsedTx, keyType);
    if (reguestLoginChallenge !== loginChallenge) {
      throw new createHttpError[401]('Invalid login challenge');
    }

    // Verify that the claimed username matches the account in the transaction.
    const txOp = parsedTx.operations[0];
    const txAuthAccount = keyType === 'posting'
      ? txOp?.value?.required_posting_auths?.[0]
      : txOp?.value?.required_auths?.[0];
    if (txAuthAccount !== username) {
      throw new createHttpError.Unauthorized('Username does not match transaction authority');
    }

    // Verify signature — proves the client possesses the private key.
    try {
      const chain = await getChain();
      await chain.api.database_api.verify_authority({
        trx: parsedTx,
        pack: data.pack
      });
    } catch (verifyError) {
      logger.error(verifyError, 'Signature verification failed for user %s', username);
      throw new createHttpError.Unauthorized('Signature verification failed');
    }

    // Create User object from verified login data.
    try {
      verifiedUser = await verifyLogin(data);
      result = verifiedUser.isLoggedIn;
    } catch (error) {
      logger.error(error, 'Failed to create user object for %s', username);
    }
  } else {
    result = await verifyLoginChallenge(chainAccount, signatures, JSON.stringify({ loginChallenge }));
  }

  if (!result) {
    throw new createHttpError.Unauthorized('Invalid username or password');
  }

  let chatAuthToken = '';
  const oauthConsent: { [key: string]: boolean } = {};
  logger.info('Chat integration check: iframeEnable=%s, strict=%s, allowNonStrict=%s',
    siteConfig.openhiveChatIframeIntegrationEnable,
    verifiedUser?.strict,
    siteConfig.openhiveChatAllowNonStrictLogin
  );
  if (
    siteConfig.openhiveChatIframeIntegrationEnable &&
    (verifiedUser?.strict || siteConfig.openhiveChatAllowNonStrictLogin)
  ) {
    const result = await getChatAuthToken(username);
    logger.info('getChatAuthToken result: success=%s, hasToken=%s', result.success, !!result.data?.authToken);
    if (result.success) {
      chatAuthToken = result.data.authToken;
      oauthConsent[siteConfig.openhiveChatClientId] = true;
    }
  }

  const user: User = {
    isLoggedIn: true,
    username,
    avatarUrl: hiveUserProfile?.profile_image || '',
    loginType,
    keyType,
    authenticateOnBackend,
    chatAuthToken,
    oauthConsent,
    strict: verifiedUser?.strict ? true : false
  };
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();

  // Set account_info cookie for page visit logging in Edge Runtime middleware.
  // This mirrors the verified identity from iron-session in a format readable
  // without decryption. Set after verify_authority + session.save() so the
  // values are trustworthy. Session cookie (no Max-Age) to match iron-session.
  const securePart = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const existing = res.getHeader('Set-Cookie') || [];
  const cookies = Array.isArray(existing) ? existing : [String(existing)];
  cookies.push(`account_info=${username}:${loginType}; Path=/; HttpOnly; SameSite=Lax${securePart}`);
  res.setHeader('Set-Cookie', cookies);

  // Log login event atomically with session creation
  const uid = req.cookies['session_uid'] || 'n/a';
  logLoginEvent(getClientIpFromApiRequest(req), username, loginType, uid);

  res.json(user);
};
