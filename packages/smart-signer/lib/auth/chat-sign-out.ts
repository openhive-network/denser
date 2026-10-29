import type { User } from '@smart-signer/types/common';

/** What denser's `/api/auth/logout` answers */
export type SignOutAnswer = User & {
  /** denser's server ended every chat session the signed-out session held on the chat server */
  chatSessionsEnded: boolean;
};

function chatSessionsEndedIn(answer: unknown): boolean {
  return typeof answer === 'object' && answer !== null && Reflect.get(answer, 'chatSessionsEnded') === true;
}

let pending: Promise<boolean> | null = null;

/**
 * Records, in this page, a sign-out from denser that is beginning. Call the function it returns
 * with `/api/auth/logout`'s answer, or with null when there is none.
 */
export function beginSignOut(): (answer: unknown) => void {
  let settle: (ended: boolean) => void = () => {};
  pending = new Promise<boolean>((resolve) => (settle = resolve));
  return (answer) => settle(chatSessionsEndedIn(answer));
}

/**
 * The sign-out begun last that nothing has taken yet, resolving to whether denser's server ended
 * the chat sessions; null when there is none. Taking it removes it.
 */
export function takeSignOut(): Promise<boolean> | null {
  const taken = pending;
  pending = null;
  return taken;
}
