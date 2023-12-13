import { sessionOptions, IronSessionData } from 'lib/session';
import { NextApiHandler } from "next";
import { getIronSession } from 'iron-session';
import { apiHandler } from "@/auth/lib/api";

export type User = {
  isLoggedIn: boolean
  username: string
  avatarUrl: string
  loginType: string;
};

export const defaultUser: User = {
  isLoggedIn: false,
  username: '',
  avatarUrl: '',
  loginType: '',
};

const getUser: NextApiHandler<User> = async (req, res) => {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  if (session.user) {
    res.json({
      ...session.user,
      isLoggedIn: true,
    });
  } else {
    res.json(defaultUser);
  }
};

export default apiHandler({
  GET: getUser,
});
