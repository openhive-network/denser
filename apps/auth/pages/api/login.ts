import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import NextCors from 'nextjs-cors';
import type { User } from './user';
import { sessionOptions } from '@/auth/lib/session';
import { corsOptions } from '@/auth/lib/cors-options';
import { getLogger } from "@hive/ui/lib/logging";
import { getHiveUserProfile } from '@/auth/lib/hive-user-profile';

const logger = getLogger('app');

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {

  const corsOptionsLocal = {
    methods: ['HEAD', 'POST'],
  };
  await NextCors(req, res, {...corsOptions, ...corsOptionsLocal});

  if (req.method === 'HEAD') {
    res.status(204).end();
  } else if (req.method === 'POST') {
    try {
      const { username } = await req.body;
      if (!username || username === 'undefined') {
        res.status(400);
        throw new Error('Missing username');
      }
      const hiveUserProfile = await getHiveUserProfile(username);
      const user = { isLoggedIn: true, username: username, avatarUrl: hiveUserProfile?.picture || '' } as User;
      req.session.user = user;
      await req.session.save();
      res.json(user);
    } catch (error) {
      if (!res.status) {
        res.status(500);
      }
      res.json({ message: (error as Error).message });
    }
  } else {
    res.status(405).end();
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);
