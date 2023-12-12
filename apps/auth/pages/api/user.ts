import { NextApiRequest, NextApiResponse } from 'next';
import { sessionOptions, IronSessionData } from 'lib/session';
import { getIronSession } from 'iron-session';

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

async function userRoute(
    req: NextApiRequest,
    res: NextApiResponse<User>
    ) {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  if (session.user) {
    res.json({
      ...session.user,
      isLoggedIn: true,
    });
  } else {
    res.json(defaultUser);
  }
}

export default userRoute;
