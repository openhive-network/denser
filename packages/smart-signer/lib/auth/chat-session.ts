import type { User } from '@smart-signer/types/common';
import { setSessionUser } from '@smart-signer/lib/auth/accounts';

/** Invalidates `chatAuthToken`, a Rocket.Chat login token of `username`'s chat account. */
export type ChatTokenRevoker = (username: string, chatAuthToken: string) => Promise<void>;

/** Reports a revocation that failed. `reason` never contains the token. */
export type ChatRevocationFailureReporter = (username: string, reason: string) => void;

/** How the chat server in use ends a denser user's sessions on it. */
export interface ChatSessionEnder {
  /** Identifies the chat-server session `user` holds, so each is ended once; '' when there is none */
  sessionOf(user: User): string;
  /**
   * Ends that session on the chat server; resolves to whether the chat server confirmed it. Never
   * rejects: it reports its own failures.
   */
  end(user: User): Promise<boolean>;
}

interface ChatSessionHolder {
  user?: User;
  accounts?: User[];
}

/** Rocket.Chat's sessions: the chat login token each user holds, revoked through `revoke`. */
export function rocketChatSessionEnder(
  revoke: ChatTokenRevoker,
  onFailure: ChatRevocationFailureReporter
): ChatSessionEnder {
  return {
    sessionOf: (user) => user.chatAuthToken,
    end: ({ username, chatAuthToken }) =>
      revoke(username, chatAuthToken).then(
        () => true,
        (error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error);
          onFailure(username, reason.replaceAll(chatAuthToken, '[redacted]'));
          return false;
        }
      )
  };
}

/**
 * Ends the chat session of the session's current user as it stops being the current user, without
 * waiting for the chat server, and forgets its chat token, so switching back to that account
 * requests a new one. Does nothing for a user holding no chat session, or when `incoming`, the
 * user taking over, holds the very same one.
 */
export function endCurrentChatSession(session: ChatSessionHolder, ender: ChatSessionEnder, incoming?: User): void {
  const user = session.user;
  if (!user) return;
  const chatSession = ender.sessionOf(user);
  if (!chatSession || (incoming && ender.sessionOf(incoming) === chatSession)) return;
  void ender.end(user);
  if (user.chatAuthToken) setSessionUser(session, { ...user, chatAuthToken: '' });
}

/**
 * Ends every chat session the session holds, its current user's and those of the accounts it
 * remembers, once each, all at once. For a session about to be destroyed: the sessions are read
 * before this returns. Resolves to whether there was at least one and the chat server confirmed
 * the end of each.
 */
export function endAllChatSessions(session: ChatSessionHolder, ender: ChatSessionEnder): Promise<boolean> {
  const holders = [...(session.user ? [session.user] : []), ...(session.accounts ?? [])];
  const ended = new Map<string, Promise<boolean>>();
  for (const user of holders) {
    const chatSession = ender.sessionOf(user);
    if (chatSession && !ended.has(chatSession)) ended.set(chatSession, ender.end(user));
  }
  return Promise.all(ended.values()).then((confirmed) => confirmed.length > 0 && confirmed.every(Boolean));
}
