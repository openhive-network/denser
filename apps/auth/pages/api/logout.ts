import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import { sessionOptions } from 'lib/session';
import { User, defaultUser } from 'pages/api/user';

function logoutRoute(req: NextApiRequest, res: NextApiResponse<User>) {
  req.session.destroy()
  res.json(defaultUser)
}

export default withIronSessionApiRoute(logoutRoute, sessionOptions)
