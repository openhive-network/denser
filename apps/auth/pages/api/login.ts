import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import type { User } from './user';
import { sessionOptions } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getHiveUserProfile } from '@/auth/lib/hive-user-profile';

const logger = getLogger('app');

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'HEAD') {
    res.status(204).end();
  } else if (req.method === 'OPTIONS') {
    res.status(204).end();
  } else if (req.method === 'POST') {
    try {
      const { username } = await req.body;
      if (!username) {
        res.status(400).json({ message: 'Missing username' });
      }
      const hiveUserProfile = await getHiveUserProfile(username);
      const user = { isLoggedIn: true, username: username, avatarUrl: hiveUserProfile?.picture || '' } as User;
      req.session.user = user;
      await req.session.save();
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);
