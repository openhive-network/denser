import createHttpError from "http-errors";
import { NextApiHandler } from "next";
import { cryptoUtils, PublicKey, Signature, KeyRole } from "@hiveio/dhive";
import { getIronSession } from 'iron-session';
import { oidc } from '@smart-signer/lib/oidc';
import { sessionOptions } from '@smart-signer/lib/session';
import { getLogger } from "@hive/ui/lib/logging";
import { getAccount } from '@hive/ui/lib/hive';
import { FullAccount } from "@hive/ui/store/app-types";
import { postLoginSchema, PostLoginSchema, Signatures } from "@smart-signer/lib/auth/utils";
import { redirect } from 'next/navigation';
import { User } from '@smart-signer/types/common';
import { IronSessionData } from '@smart-signer/types/common';
import { cookieNamePrefix } from '@smart-signer/lib/session';
import { checkCsrfHeader } from "@smart-signer/lib/csrf-protection";

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
          'verifyLoginChallenge signature verification failed for user %s %o',
          chainAccount.name,
          {message, messageHash: messageHash.toString('hex'), signature}
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


export const loginUser: NextApiHandler<User> = async (req, res) => {

  checkCsrfHeader(req);

  const { slug } = req.query;
  // try {
  //   if (slug) {
  //     const {
  //       uid, prompt, params, session, returnTo,
  //     } = await oidc.interactionDetails(req, res);
  //     logger.info('api loginUser: %o', {
  //       slug, uid, prompt, params, session, returnTo,
  //     });
  //   } else {
  //     logger.info('api loginUser: no slug');
  //   }
  // } catch(e) {
  //   // throw e;
  //   logger.error(e);
  // }

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

  const loginChallenge = req.cookies[`${cookieNamePrefix}login_challenge_server`] || '';

  const result = await verifyLoginChallenge(
    chainAccount,
    signatures,
    JSON.stringify({ loginChallenge }, null, 0),
    );

  if (!result) {
    if (slug) {
      const oidcResult = {
        error: 'access_denied',
        error_description: 'Username or password is incorrect.',
      }
      // redirect('oidc/auth/' + slug[0]);
      try {
        return await oidc.interactionFinished(req, res, oidcResult, {
          mergeWithLastSubmission: false,
        });
      } catch (e) {
        logger.error(e);
      }
    }
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
