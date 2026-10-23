import { getLogger } from '@hive/ui/lib/logging';
import { siteConfig } from '@ui/config/site';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { reportChatRevocationFailure, revokeChatAuthToken } from '@smart-signer/lib/rocket-chat';
import { rocketChatSessionEnder, type ChatSessionEnder } from '@smart-signer/lib/auth/chat-session';
import { matrixSessionEnder } from '@smart-signer/lib/auth/matrix-devices';

const logger = getLogger('app');

function reportMatrixCleanupFailure(userId: string, reason: string): void {
  logger.error('Deleting the Matrix devices of %s failed: %s', userId, reason);
}

/**
 * Ends the chat sessions of the chat server in use: a Matrix user's devices on Synapse, or a
 * Rocket.Chat login token. In Matrix mode without an admin token users hold no Rocket.Chat token,
 * so nothing is ended.
 */
export function chatSessionEnder(): ChatSessionEnder {
  return (
    matrixSessionEnder(
      {
        provider: siteConfig.chatProvider,
        homeserverUrl: siteConfig.matrixChat.homeserverUrl,
        serverName: siteConfig.matrixChat.serverName,
        adminToken: siteConfig.matrixAdminToken
      },
      fetchJson,
      reportMatrixCleanupFailure
    ) ?? rocketChatSessionEnder(revokeChatAuthToken, reportChatRevocationFailure)
  );
}
