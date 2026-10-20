'use client';

import { useEffect, useState } from 'react';
import { adoptLiteRootDraft, takeLiteReplySignIn } from './lite-sign-in-handoff';

/** Opens the reply to `author/permlink` once signed in, when the guest left it to sign in. */
export function useReopenReplyAfterSignIn(author: string, permlink: string, isLoggedIn: boolean, openReply: () => void): void {
  useEffect(() => {
    if (isLoggedIn && author && takeLiteReplySignIn(author, permlink)) openReply();
  }, [isLoggedIn, author, permlink, openReply]);
}

/**
 * Adopts a guest's root-post draft into `ownKey` (the signed-in user's new-post draft) and says
 * when that is done: the post editor reads its draft once, on mount, so it mounts after this.
 */
export function useAdoptedLiteRootDraft(ownKey: string): boolean {
  const [adoptedFor, setAdoptedFor] = useState<string>();

  useEffect(() => {
    if (!ownKey) return;
    adoptLiteRootDraft(ownKey);
    setAdoptedFor(ownKey);
  }, [ownKey]);

  return !!ownKey && adoptedFor === ownKey;
}
