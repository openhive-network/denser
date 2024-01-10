import { NextApiRequest, NextApiResponse } from 'next';
import { sessionOptions } from 'lib/session';
import { getIronSession } from 'iron-session';
import { defaultUser } from '@angala/lib/auth/utils';
import { User } from '@angala/types/common';
import { IronSessionData } from '@angala/types/common';
import { NextApiHandler } from "next";
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
