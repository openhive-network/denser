import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import type { User } from './user';
import { sessionOptions } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getHiveUserProfile } from '@/auth/lib/hive-user-profile';

const logger = getLogger('app');

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  const { username } = await req.body
  try {
    const hiveUserProfile = await getHiveUserProfile(username);
    const user = { isLoggedIn: true, username: username, avatarUrl: hiveUserProfile?.picture || '' } as User;
    req.session.user = user;
    await req.session.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);
