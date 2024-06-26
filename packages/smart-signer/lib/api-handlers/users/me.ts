import { NextApiHandler } from "next";
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export const getUser: NextApiHandler<User> = async (req, res) => {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  if (session.user) {
    logger.info('getUser', session.user);
    res.json({
      ...session.user,
      isLoggedIn: true,
      sub: session.user.username,
    });
  } else {
    res.json(defaultUser);
  }
  logger.info('getUser: req headers auth: %o', req.headers);
  logger.info('getUser: session: %o', session);

};
