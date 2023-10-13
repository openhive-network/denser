import createHttpError from "http-errors";
import * as Yup from "yup";
import { NextApiHandler } from "next";
import { withIronSessionApiRoute } from 'iron-session/next';

import { sessionOptions } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getAccount } from '@hive/ui/lib/hive';
import { apiHandler } from "@/auth/lib/api";
import type { User } from './user';


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
    hiveUserProfile = (await getAccount(username))?.profile;
    if (!hiveUserProfile) {
      throw new Error(`missing blockchain account "${username}"`);
    }
  } catch (error) {
    if (error instanceof Error) {
      if ((error.message).startsWith('missing blockchain account')) {
        throw new createHttpError.NotFound(
            `Hive user ${username} not found`);
      }
    }
    throw error;
  }

  const user = {
    isLoggedIn: true,
    username: username,
    avatarUrl: hiveUserProfile?.profile_image || ''
  } as User;
  req.session.user = user;
  await req.session.save();
  res.json(user);
};


export default apiHandler({
  POST: withIronSessionApiRoute(loginUser, sessionOptions),
});
