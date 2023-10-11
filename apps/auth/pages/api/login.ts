import { NextApiRequest, NextApiResponse } from 'next';
import { withIronSessionApiRoute } from 'iron-session/next';
import Cors, { CorsOptions } from 'cors';
import type { User } from './user';
import { runMiddleware } from '@/auth/lib/run-middleware';
import { sessionOptions } from '@/auth/lib/session';
import { corsOptionsDefault } from '@/auth/lib/cors-options';
import { getLogger } from "@hive/ui/lib/logging";
import { getHiveUserProfile } from '@/auth/lib/hive-user-profile';

const logger = getLogger('app');


// Initializing the cors middleware. You can read more about the
// available options here:
// https://github.com/expressjs/cors#configuration-options.
const corsOptions: CorsOptions = {
  methods: ['HEAD', 'POST'],
};
const cors = Cors({
  ...corsOptionsDefault,
  ...corsOptions
})

async function loginRoute(req: NextApiRequest, res: NextApiResponse) {

  await runMiddleware(req, res, cors)

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
      let status = 500 || res.status;
      res.status(status).json({ message: (error as Error).message });
    }
  } else {
    res.status(405).end();
  }
}

export default withIronSessionApiRoute(loginRoute, sessionOptions);
