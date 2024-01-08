import createHttpError from "http-errors";
import { NextApiHandler } from "next";
import { cryptoUtils, PublicKey, Signature, KeyRole } from "@hiveio/dhive";
import { getIronSession } from 'iron-session';
import { oidc } from '@/auth/lib/oidc';
import { sessionOptions, IronSessionData } from '@/auth/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getAccount } from '@hive/ui/lib/hive';
import { apiHandler } from "@/auth/lib/api";
import { validateHiveAccountName } from '@/auth/lib/validate-hive-account-name';
import type { User } from './user';
import { FullAccount } from "@hive/ui/store/app-types";
import { postLoginSchema, PostLoginSchema } from "@/auth/lib/auth/utils";

const logger = getLogger('app');

const verifyLoginChallenge = async (
      chainAccount: FullAccount,
      signatures: Signatures,
      message: string = ''
    ) => {

  const verify = (
      keyRole: KeyRole,
      signature: string,
      pubkey: string | PublicKey,
      weight: number,
      weight_threshold: number,
      message: string
      ) => {
    logger.info(
      'verifyLoginChallenge args: %o',
      { account: chainAccount.name, keyRole, signature, pubkey,
          weight, weight_threshold }
      );
    if (!signature) return;
    if (weight !== 1 || weight_threshold !== 1) {
      logger.error(
        `verifyLoginChallenge unsupported ${keyRole} auth configuration for user ${chainAccount.name}`
      );
    } else {
      const sig = Signature.fromString(signature);
      let publicKey = PublicKey.from(pubkey);
      const messageHash = cryptoUtils.sha256(message);
      const verified = publicKey.verify(messageHash, sig);
      if (!verified) {
        logger.error(
          `verifyLoginChallenge signature verification failed for user ${chainAccount.name}`
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

  const data: PostLoginSchema = await postLoginSchema.parseAsync(req.body);

  const { slug } = req.query;

  // try {
  //   if (slug) {
  //     const {
  //       uid, prompt, params, session, returnTo,
  //     } = await oidc.interactionDetails(req, res);
  //     logger.info('api loginUser : %o', {
  //       slug, uid, prompt, params, session, returnTo,
  //     });
  //   } else {
  //     logger.info('api loginUser: no slug');
  //   }
  // } catch(e) {
  //   throw e;
  // }

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

  const loginChallenge = req.cookies.loginChallengeServer || '';

  const result = await verifyLoginChallenge(
    chainAccount,
    signatures,
    JSON.stringify({ token: loginChallenge }, null, 0),
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
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  session.user = user;
  await session.save();
  res.json(user);
};

export default apiHandler({
  POST: loginUser,
});
