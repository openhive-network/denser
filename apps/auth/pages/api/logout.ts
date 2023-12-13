import createHttpError from "http-errors";
import { NextApiHandler } from "next";
import { getIronSession } from 'iron-session';
import { sessionOptions, IronSessionData } from '@/auth/lib/session';
import { User, defaultUser } from 'pages/api/user';
import { apiHandler } from "@/auth/lib/api";

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
