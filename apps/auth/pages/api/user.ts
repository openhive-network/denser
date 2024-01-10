import { NextApiRequest, NextApiResponse } from 'next';
import { sessionOptions } from 'lib/session';
import { getIronSession } from 'iron-session';
import { defaultUser } from '@/auth/lib/auth/utils';
import { User } from '@/auth/types/common';
import { IronSessionData } from '@/auth/types/common';
import { NextApiHandler } from "next";
import { apiHandler } from "@/auth/lib/api";

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
