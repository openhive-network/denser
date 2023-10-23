import { NextApiRequest, NextApiResponse } from 'next'
import { withIronSessionApiRoute } from 'iron-session/next'
import { sessionOptions } from 'lib/session'
import type { User } from 'pages/api/user'

function logoutRoute(req: NextApiRequest, res: NextApiResponse<User>) {
  req.session.destroy()
  const user: User = {
        isLoggedIn: false,
        username: '',
        avatarUrl: ''
      };
  res.json(user)
}

export default withIronSessionApiRoute(logoutRoute, sessionOptions)
