import createHttpError from "http-errors";
import { NextApiHandler } from "next";
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@smart-signer/lib/session';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { apiHandler } from "@smart-signer/lib/api";

const logoutUser: NextApiHandler<User> = async (req, res) => {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  if (session.user) {
    session.destroy();
    res.json(defaultUser);
  } else {
    throw new createHttpError.NotFound('Cannot logout unknown user');
  }
};

export default apiHandler({
  POST: logoutUser,
});
