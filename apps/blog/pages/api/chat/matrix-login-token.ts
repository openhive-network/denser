import { getIronSession } from 'iron-session';
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiHandler } from '@smart-signer/lib/api';
import { sessionOptions } from '@smart-signer/lib/session';
import type { IronSessionData } from '@smart-signer/types/common';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import {
  mintMatrixLoginToken,
  mintMatrixLoginTokenCreatingAccount,
  syncMatrixDisplayName
} from '@smart-signer/lib/auth/matrix-login-token';
import { getHiveUserProfile } from '@smart-signer/lib/get-hive-user-profile';
import { oauthDisplayName, profileDisplayName } from '@smart-signer/lib/oauth/profile-text';
import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@hive/ui/config/site';
import { matrixLoginTokenHandler } from '@/blog/lib/matrix-login-token-route';

const logger = getLogger('app');

const matrixAdmin = {
  homeserverUrl: siteConfig.matrixChat.homeserverUrl,
  serverName: siteConfig.matrixChat.serverName,
  adminToken: siteConfig.matrixAdminToken,
  defaultRoom: siteConfig.matrixChat.defaultRoom
};

function reportMintFailure(userId: string, reason: string): void {
  logger.error('A Matrix login token for %s: %s', userId, reason);
}

/** The display name SSO sign-in through denser's userinfo gives the account */
async function matrixDisplayName(username: string): Promise<string> {
  return oauthDisplayName(await getHiveUserProfile(username), username);
}

/**
 * A login token for `username`, whose Matrix account then has the display name of their Hive
 * profile, when it names one; the profile is read while the token is minted
 */
async function mint(username: string, createAccount: boolean) {
  const displayName = getHiveUserProfile(username).then(profileDisplayName);
  const minted = await (createAccount
    ? mintMatrixLoginTokenCreatingAccount(username, matrixDisplayName, matrixAdmin, fetchJson, reportMintFailure)
    : mintMatrixLoginToken(username, matrixAdmin, fetchJson, reportMintFailure));
  const name = await displayName;
  if (minted.kind === 'token' && name) {
    await syncMatrixDisplayName(username, name, matrixAdmin, fetchJson, reportMintFailure);
  }
  return minted;
}

async function sessionUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  return session.user;
}

export default apiHandler({
  POST: matrixLoginTokenHandler({
    provider: siteConfig.chatProvider,
    minting: !!(matrixAdmin.adminToken && matrixAdmin.homeserverUrl && matrixAdmin.serverName),
    eligibility: {
      allowNonStrictLogin: siteConfig.openhiveChatAllowNonStrictLogin,
      allowedUsers: siteConfig.openhiveChatAllowedUsers
    },
    sessionUser,
    mint
  })
});
