import { useEffect, useRef, type RefObject } from 'react';
import { fetchMatrixLoginToken } from '@/blog/lib/fetch-matrix-login-token';

// The session page's protocol (stack/matrix/chat-origin/denser-session.html)
const LOGIN_TOKEN_REQUEST = 'denser-matrix-login-token-request';
const LOGIN_TOKEN_ANSWER = 'denser-matrix-login-token';

function isLoginTokenRequest(data: unknown): data is { type: string; user: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    Reflect.get(data, 'type') === LOGIN_TOKEN_REQUEST &&
    typeof Reflect.get(data, 'user') === 'string'
  );
}

/**
 * A login token for `userId`, creating a missing Matrix account only if the drawer is open: asked
 * for again with that when the drawer opened while a warm-up's request found none.
 */
async function mintLoginToken(drawerOpenRef: RefObject<boolean>): Promise<string | null> {
  const askedOpen = drawerOpenRef.current;
  const loginToken = await fetchMatrixLoginToken(askedOpen);
  if (loginToken || askedOpen || !drawerOpenRef.current) return loginToken;
  return fetchMatrixLoginToken(true);
}

/**
 * Answers the session page in `frameRef` when it asks for a login token for `userId`, posting it
 * to `elementOrigin` only, so the token never travels in a URL. A request from another window or
 * origin is ignored. The mint creates a missing Matrix account only while `drawerOpen`, not for a
 * warm-up. Without a token (another user, no account yet, a failed mint), an open drawer is
 * answered with none, which sends the session page through SSO; a closed one is not answered,
 * as that SSO would create the account, and `onUnsignedWarmUp` is called instead, which has to
 * unload the frame before the session page stops waiting for an answer.
 */
export function useMatrixLoginTokenAnswer(
  frameRef: RefObject<HTMLIFrameElement | null>,
  elementOrigin: string | undefined,
  userId: string,
  drawerOpen: boolean,
  onUnsignedWarmUp: () => void
): void {
  const drawerOpenRef = useRef(drawerOpen);
  const onUnsignedWarmUpRef = useRef(onUnsignedWarmUp);
  useEffect(() => {
    drawerOpenRef.current = drawerOpen;
    onUnsignedWarmUpRef.current = onUnsignedWarmUp;
  }, [drawerOpen, onUnsignedWarmUp]);

  useEffect(() => {
    if (!elementOrigin || !userId) return;
    const onMessage = async (event: MessageEvent) => {
      const frame = frameRef.current?.contentWindow;
      if (!frame || event.source !== frame || event.origin !== elementOrigin || !isLoginTokenRequest(event.data)) {
        return;
      }
      const loginToken = event.data.user === userId ? await mintLoginToken(drawerOpenRef) : null;
      if (!loginToken && !drawerOpenRef.current) {
        onUnsignedWarmUpRef.current();
        return;
      }
      frame.postMessage({ type: LOGIN_TOKEN_ANSWER, loginToken }, elementOrigin);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameRef, elementOrigin, userId]);
}
