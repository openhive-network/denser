import { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { IronSessionData, sessionOptions } from '@/blog/lib/session';

export type User = {
  isLoggedIn: boolean;
  username: string;
  avatarUrl: string;
  loginType: string;
};

export const defaultUser: User = {
  isLoggedIn: false,
  username: '',
  avatarUrl: '',
  loginType: ''
};

async function userRoute(req: NextApiRequest, res: NextApiResponse<User>) {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  if (session.user) {
    res.json({
      ...session.user,
      isLoggedIn: true
    });
  } else {
    res.json(defaultUser);
  }
}

export default userRoute;
