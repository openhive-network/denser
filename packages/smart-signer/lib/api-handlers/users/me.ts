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
  logger.info('getUser: { req, res, session}: ', { req, res, session });
  if (session.user) {
    logger.info('getUser', session.user);
    res.json({
      ...session.user,
      isLoggedIn: true,
    });
  } else {
    res.json(defaultUser);
  }
};
