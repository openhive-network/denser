import createHttpError from "http-errors";
import * as Yup from "yup";
import { NextApiHandler } from "next";
import { withIronSessionApiRoute } from 'iron-session/next';

import { sessionOptions } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getAccount } from '@hive/ui/lib/hive';
import { apiHandler } from "@/auth/lib/api";
import type { User } from './user';

export interface Signatures {
  memo?: string;
  posting?: string;
  active?: string;
  owner?: string;
}

export interface LoginData {
  username: string;
  signatures: Signatures;
  loginType: 'password' | 'hiveauth' | 'hivesigner' | 'keychain';
  hivesignerToken: string;
}

const RE_LOGIN_TYPE = /^(password|hiveauth|hivesigner|keychain)$/;

const logger = getLogger('app');

const loginUser: NextApiHandler<User> = async (req, res) => {
  const postLoginSchema = Yup.object().shape({
    // _csrf: Yup.string().required(),
    username: Yup.string().required('username is required'),
    signatures: Yup.object().shape({
      posting: Yup.string()
    }),
    loginType: Yup.string()
      .required('loginType is required')
      .matches(RE_LOGIN_TYPE),
    hivesignerToken: Yup.string()
      .defined('hivesignerToken must be defined')
      .strict(true),
  });

  const data = await postLoginSchema.validate(req.body);
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
  const user: User = {
        isLoggedIn: true,
        username: username,
        avatarUrl: hiveUserProfile?.profile_image || ''
      };
  req.session.user = user;
  await req.session.save();
  res.json(user);
};

export default apiHandler({
  POST: withIronSessionApiRoute(loginUser, sessionOptions),
});
