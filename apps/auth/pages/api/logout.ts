import { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/auth/lib/session';
import { defaultUser } from '@/auth/lib/auth/utils';
import { User } from '@/auth/types/common';
import { IronSessionData } from '@/auth/types/common';

async function logoutRoute(req: NextApiRequest, res: NextApiResponse<User>) {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.destroy();
  res.json(defaultUser);
}

export default logoutRoute;
