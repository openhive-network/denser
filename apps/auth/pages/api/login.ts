import createHttpError from "http-errors";
import * as z from 'zod';
import { NextApiHandler } from "next";
import { withIronSessionApiRoute } from 'iron-session/next';
import { cryptoUtils, PublicKey, Signature, KeyRole } from "@hiveio/dhive";
import { sessionOptions } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getAccount } from '@hive/ui/lib/hive';
import { apiHandler } from "@/auth/lib/api";
import { validateHiveAccountName } from '@/auth/lib/validate-hive-account-name';
import type { User } from './user';
import { FullAccount } from "@hive/ui/store/app-types";

export interface Signatures {
  memo?: string;
  posting?: string;
  active?: string;  // const data = await postLoginSchema.validate(req.body);

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

const verifyLoginChallenge = async (
      chainAccount: FullAccount,
      signatures: Signatures,
      message: string = ''
    ) => {

  logger.info(`Starting verifyLoginChallenge for user ${chainAccount.name}`);

  const verify = (
      keyRole: KeyRole,
      signature: string,
      pubkey: string | PublicKey,
      weight: number,
      weight_threshold: number,
      message: string
      ) => {
    logger.info('Starting verify args: %o', { keyRole, signature, pubkey, weight, weight_threshold });
    if (!signature) return;
    if (weight !== 1 || weight_threshold !== 1) {
      console.error(
        `verifyLoginChallenge unsupported ${keyRole} auth configuration for user ${chainAccount.name}`
      );
    } else {
      const sig = Signature.fromString(signature);
      let publicKey = PublicKey.from(pubkey);
      const messageHash = cryptoUtils.sha256(message);
      const verified = publicKey.verify(messageHash, sig);
      if (!verified) {
        console.error(
          'verifyLoginChallenge signature verification failed'
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
    posting_pubkey, weight, weight_threshold, message);
  return result;
};


const loginUser: NextApiHandler<User> = async (req, res) => {

  const postLoginSchema = z.object({
    username: z.string()
        .nonempty('username is required')
        .superRefine((val, ctx) => {
            const result = validateHiveAccountName(val, (v) => v);
            console.log({result});
            if (result) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: result,
                    fatal: true,
                });
                return z.NEVER;
            }
            return true;
          }),
    signatures: z.object({
        posting: z.string()
    }),
    loginType: z.string()
        .nonempty('loginType is required')
        .regex(RE_LOGIN_TYPE, 'invalid loginType'),
    hivesignerToken: z.string({
        required_error: "hivesignerToken is required",
        invalid_type_error: "hivesignerToken must be a string",
    })
  });

  type PostLoginSchema = z.infer<typeof postLoginSchema>;

  const data: PostLoginSchema = await postLoginSchema.parseAsync(req.body);

  const { username, loginType, signatures } = data;
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


  const result = await verifyLoginChallenge(
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
        username,
        avatarUrl: hiveUserProfile?.profile_image || '',
        loginType,
      };
  req.session.user = user;
  await req.session.save();
  res.json(user);
};

export default apiHandler({
  POST: withIronSessionApiRoute(loginUser, sessionOptions),
});
