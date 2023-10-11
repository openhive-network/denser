import { withIronSessionApiRoute } from 'iron-session/next';
import type { User } from './user';
import { sessionOptions } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getHiveUserProfile } from '@/auth/lib/hive-user-profile';

import createHttpError from "http-errors";
import * as Yup from "yup";
import { NextApiHandler } from "next";
import { apiHandler } from "@/auth/lib/api";


const logger = getLogger('app');

const postUserSchema = Yup.object()
  .shape({
    username: Yup.string().required("Username is required!"),
  })
  .noUnknown(true);


const loginUser: NextApiHandler<User> = async (req, res) => {
  const data = await postUserSchema.validate(req.body);
  const { username } = data;
  let hiveUserProfile;
  try {
    hiveUserProfile = await getHiveUserProfile(username);
  } catch (error) {
    if (error instanceof Error) {
      if ((error.message).startsWith('gethiveUserProfile error: missing blockchain account')) {
        throw new createHttpError.NotFound(`Hive user ${username} not found`);
      }
    }
    throw error;
  }
  const user = {
    isLoggedIn: true,
    username: username,
    avatarUrl: hiveUserProfile?.picture || ''
  } as User;
  req.session.user = user;
  await req.session.save();
  res.json(user);
};


export default apiHandler({
  POST: withIronSessionApiRoute(loginUser, sessionOptions),
});
