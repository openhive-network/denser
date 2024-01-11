import { NextApiHandler } from "next";
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@angala/lib/session';
import { defaultUser } from '@angala/lib/auth/utils';
import { User } from '@angala/types/common';
import { IronSessionData } from '@angala/types/common';
import { apiHandler } from "@angala/lib/api";

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
