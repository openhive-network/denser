import createHttpError from 'http-errors';
import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { User, IronSessionData } from '@smart-signer/types/common';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { postAccountSchema } from '@smart-signer/lib/auth/utils';
import { findAccount, removeAccount } from '@smart-signer/lib/auth/accounts';
import { setAccountInfoCookie } from '@smart-signer/lib/account-info-cookie';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/** Make an account signed in earlier in this session the current user, without signing in again. */
export const switchAccount: NextApiHandler<User> = async (req, res) => {
  checkCsrfHeader(req);
  const { username } = await postAccountSchema.parseAsync(req.body);

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  const account = session.user ? findAccount(session.accounts ?? [], username) : undefined;
  if (!account) {
    throw new createHttpError.Unauthorized(`Account ${username} is not signed in`);
  }

  logger.info('Switching account from %s to %s', session.user?.username, username);
  session.user = account;
  await session.save();
  setAccountInfoCookie(res, account.username, account.loginType);

  res.json({ ...account, isLoggedIn: true });
};

/** Forget an account signed in earlier in this session. The current user cannot be removed. */
export const removeSessionAccount: NextApiHandler<User[]> = async (req, res) => {
  checkCsrfHeader(req);
  const { username } = await postAccountSchema.parseAsync(req.body);

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  if (session.user?.username === username) {
    throw new createHttpError.BadRequest('The current account cannot be removed');
  }

  session.accounts = removeAccount(session.accounts ?? [], username);
  await session.save();

  res.json(session.accounts);
};
