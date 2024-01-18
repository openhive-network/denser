import createHttpError from "http-errors";
import { NextApiHandler } from "next";
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export const logoutUser: NextApiHandler<User> = async (req, res) => {
  try {
    const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
    if (session) {
      session.destroy();
    }
  } catch (error) {
    logger.error('Error in logoutUser %o', error);
  }
  res.json(defaultUser);
};
