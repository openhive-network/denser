import { getIronSession } from 'iron-session';
import type { NextApiRequest, NextApiResponse } from 'next';
import { apiHandler } from '@smart-signer/lib/api';
import { sessionOptions } from '@smart-signer/lib/session';
import type { IronSessionData } from '@smart-signer/types/common';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { mintMatrixLoginToken } from '@smart-signer/lib/auth/matrix-login-token';
import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@hive/ui/config/site';
import { matrixLoginTokenHandler } from '@/blog/lib/matrix-login-token-route';

const logger = getLogger('app');

const matrixAdmin = {
  homeserverUrl: siteConfig.matrixChat.homeserverUrl,
  serverName: siteConfig.matrixChat.serverName,
  adminToken: siteConfig.matrixAdminToken
};

function reportMintFailure(userId: string, reason: string): void {
  logger.error('A Matrix login token for %s: %s', userId, reason);
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
    mint: (username) => mintMatrixLoginToken(username, matrixAdmin, fetchJson, reportMintFailure)
  })
});
