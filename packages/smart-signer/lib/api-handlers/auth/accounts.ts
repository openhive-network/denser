import createHttpError from 'http-errors';
import { NextApiHandler } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { User, IronSessionData } from '@smart-signer/types/common';
import { checkCsrfHeader } from '@smart-signer/lib/csrf-protection';
import { postAccountSchema, postSwitchSchema } from '@smart-signer/lib/auth/utils';
import { findAccount, removeAccount, setSessionUser } from '@smart-signer/lib/auth/accounts';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { clearAccountInfoCookie, setAccountInfoCookie } from '@smart-signer/lib/account-info-cookie';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/**
 * Make an account signed in earlier in this session the current user, without signing in again.
 * For an account signed in on the client only (switched to, or just signed in) the session cannot
 * hold, it stops acting as any user, keeping the accounts it holds so the client can switch back to them.
 */
export const switchAccount: NextApiHandler<User> = async (req, res) => {
  checkCsrfHeader(req);
  const { username, authenticateOnBackend } = await postSwitchSchema.parseAsync(req.body);

  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  if (!authenticateOnBackend) {
    logger.info('Switching account from %s to client-only %s', session.user?.username, username);
    delete session.user;
    await session.save();
    clearAccountInfoCookie(res);
    res.json(defaultUser);
    return;
  }

  const account = findAccount(session.accounts ?? [], username);
  if (!account) {
    throw new createHttpError.Unauthorized(`Account ${username} is not signed in`);
  }

  logger.info('Switching account from %s to %s', session.user?.username, username);
  setSessionUser(session, account);
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
