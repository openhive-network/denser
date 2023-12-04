import { NextApiRequest, NextApiResponse } from 'next'
import { withIronSessionApiRoute } from 'iron-session/next'
import { sessionOptions } from 'lib/session'

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
  if (req.session.user) {
    res.json({
      ...req.session.user,
      isLoggedIn: true,
    });
  } else {
    res.json(defaultUser);
  }
}

export default withIronSessionApiRoute(userRoute, sessionOptions);
