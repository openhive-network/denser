import { useCallback, useState } from 'react';
import type { MatrixChatPreload } from '@ui/config/chat';
import { siteConfig } from '@ui/config/site';
import { inIframe } from '@smart-signer/lib/utils';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { isEligibleForChat } from '@/blog/lib/chat-eligibility';
import { useIdleAfterLoad } from '@/blog/components/hooks/use-idle-after-load';

/** How long after the page's load an idle warm-up waits before it waits for idle */
const WARM_UP_DELAY_MS = 2_000;

/** The browser's Save-Data preference (`navigator.connection`, Chromium only) */
function prefersSavingData(): boolean {
  const connection: unknown = Reflect.get(navigator, 'connection');
  return typeof connection === 'object' && connection !== null && 'saveData' in connection && connection.saveData === true;
}

/**
 * The denser user the Matrix chat drawer is for, or empty for none: a user the server signed
 * in (Synapse trusts only those), eligible for chat, on a page that is not itself framed.
 * `configured` says whether the drawer's client has what it needs.
 */
export function useMatrixChatUser(configured: boolean): string {
  const { user } = useUserClient();
  const eligible =
    configured &&
    user.authenticateOnBackend &&
    isEligibleForChat(user, {
      allowNonStrictLogin: siteConfig.openhiveChatAllowNonStrictLogin,
      allowedUsers: siteConfig.openhiveChatAllowedUsers
    }) &&
    !inIframe();
  return eligible ? user.username : '';
}

/**
 * Whether the chat drawer's client should load, ahead of its first opening, as `preload` says:
 * once the page is idle after loading (unless `idleAllowed` is false, or under Save-Data), or on
 * intent to use the chat button, or when the drawer opens (`request`).
 */
export function useChatWarmUp(preload: MatrixChatPreload, idleAllowed: boolean) {
  const [requested, setRequested] = useState(false);
  const idle = useIdleAfterLoad(WARM_UP_DELAY_MS);
  const warmedUpOnIdle = idle && preload === 'idle' && idleAllowed && !prefersSavingData();

  const request = useCallback(() => setRequested(true), []);
  const requestOnIntent = useCallback(() => {
    if (preload !== 'off') setRequested(true);
  }, [preload]);
  const reset = useCallback(() => setRequested(false), []);

  return { warm: requested || warmedUpOnIdle, request, requestOnIntent, reset };
}
