import createHttpError from "http-errors";
import * as Yup from "yup";
import { NextApiHandler } from "next";
import { withIronSessionApiRoute } from 'iron-session/next';

// import * as Dhive from "@hiveio/dhive";
import { cryptoUtils, PublicKey, Signature, KeyRole } from "@hiveio/dhive";

import { sessionOptions } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getAccount } from '@hive/ui/lib/hive';
import { apiHandler } from "@/auth/lib/api";
import type { User } from './user';
import { FullAccount } from "@hive/ui/store/app-types";

export interface Signatures {
  memo?: string;
  posting?: string;
  active?: string;
  owner?: string;
}

export enum LoginTypes {
  password = 'password',
  hiveauth = 'hiveauth',
  hivesigner = 'hivesigner',
  keychain = 'keychain',
}

export interface LoginData {
  username: string;
  signatures: Signatures;
  loginType: LoginTypes;
  hivesignerToken: string;
}

const RE_LOGIN_TYPE = /^(password|hiveauth|hivesigner|keychain)$/;

const logger = getLogger('app');

const verifySignatures = async (
      chainAccount: FullAccount,
      signatures: Signatures,
      message: string = ''
    ) => {

  logger.info(`Starting verifySignatures for user ${chainAccount.name}`);

  const verify = (
      keyRole: KeyRole,
      sigHex: string,
      pubkey: string | PublicKey,
      weight: number,
      weight_threshold: number
      ) => {
    logger.info('Starting verify');
    logger.info({keyRole, sigHex, pubkey, weight, weight_threshold});
    if (!sigHex) return;
    if (weight !== 1 || weight_threshold !== 1) {
      console.error(
        `loginUser unsupported ${keyRole} auth configuration for user ${chainAccount.name}`
      );
    } else {
      const sig = Signature.fromString(sigHex);
      let publicKey = PublicKey.from(pubkey);
      const bufSha = cryptoUtils.sha256(message);
      const verified = publicKey.verify(bufSha, sig);
      if (!verified) {
        console.error(
          'loginUser signature verification failed'
        );
      }
      return verified;
    }
  };

  const {
    posting: {
      key_auths: [[posting_pubkey, weight]],
      weight_threshold,
    },
  } = chainAccount;
  const result = verify('posting', signatures.posting || '',
    posting_pubkey, weight, weight_threshold);
  return result;
};

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
  const { username, signatures } = data;
  let hiveUserProfile;
  let chainAccount;
  try {
    chainAccount = await getAccount(username);
    if (!chainAccount) {
      throw new Error(`missing blockchain account "${username}"`);
    }
    hiveUserProfile = chainAccount?.profile;
  } catch (error) {
    if (error instanceof Error) {
      if ((error.message).startsWith('missing blockchain account')) {
        throw new createHttpError.NotFound(
            `Hive user ${username} not found`);
      }
    }
    throw error;
  }


  const result = await verifySignatures(
    chainAccount,
    signatures,
    JSON.stringify({ token: req.session.loginChallenge }, null, 0),
    );

  if (!result) {
    throw new createHttpError.Unauthorized('Invalid username or password');
  }

  const auth = { posting: result };
  // if (ctx.session.a === account) loginType = 'resume';
  // if (auth.posting) ctx.session.a = account;

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
