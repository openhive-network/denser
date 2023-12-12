import { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions, IronSessionData } from '@/auth/lib/session';
import { User, defaultUser } from 'pages/api/user';

async function logoutRoute(req: NextApiRequest, res: NextApiResponse<User>) {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.destroy();
  res.json(defaultUser);
}

export default logoutRoute;
