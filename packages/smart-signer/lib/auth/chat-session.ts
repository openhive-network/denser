import type { User } from '@smart-signer/types/common';
import { setSessionUser } from '@smart-signer/lib/auth/accounts';

/** Invalidates `chatAuthToken`, a Rocket.Chat login token of `username`'s chat account. */
export type ChatTokenRevoker = (username: string, chatAuthToken: string) => Promise<void>;

/** Reports a revocation that failed. `reason` never contains the token. */
export type ChatRevocationFailureReporter = (username: string, reason: string) => void;

interface ChatSessionHolder {
  user?: User;
  accounts?: User[];
}

function revokeInBackground(
  { username, chatAuthToken }: User,
  revoke: ChatTokenRevoker,
  onFailure: ChatRevocationFailureReporter
): void {
  revoke(username, chatAuthToken).catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    onFailure(username, reason.replaceAll(chatAuthToken, '[redacted]'));
  });
}

/**
 * Ends the chat session of the session's current user as it stops being the current user: starts
 * revoking its chat token without waiting for Rocket.Chat, and forgets the token, so switching back
 * to that account requests a new one. Does nothing for a user holding no chat token.
 */
export function endCurrentChatSession(
  session: ChatSessionHolder,
  revoke: ChatTokenRevoker,
  onFailure: ChatRevocationFailureReporter
): void {
  const user = session.user;
  if (!user?.chatAuthToken) return;
  revokeInBackground(user, revoke, onFailure);
  setSessionUser(session, { ...user, chatAuthToken: '' });
}

/**
 * Starts revoking every chat token the session holds, its current user's and those of the accounts
 * it remembers, once each, without waiting for Rocket.Chat. For a session about to be destroyed.
 */
export function endAllChatSessions(
  session: ChatSessionHolder,
  revoke: ChatTokenRevoker,
  onFailure: ChatRevocationFailureReporter
): void {
  const holders = [...(session.user ? [session.user] : []), ...(session.accounts ?? [])];
  const revoked = new Set<string>();
  for (const user of holders) {
    if (!user.chatAuthToken || revoked.has(user.chatAuthToken)) continue;
    revoked.add(user.chatAuthToken);
    revokeInBackground(user, revoke, onFailure);
  }
}
