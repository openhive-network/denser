import createHttpError from "http-errors";
import { NextApiHandler } from "next";
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@angala/lib/session';
import { defaultUser } from '@angala/lib/auth/utils';
import { User } from '@angala/types/common';
import { IronSessionData } from '@angala/types/common';
import { apiHandler } from "@angala/lib/api";

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
