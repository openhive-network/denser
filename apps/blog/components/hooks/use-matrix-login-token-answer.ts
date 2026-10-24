import { useEffect, type RefObject } from 'react';
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
 * Answers the session page in `frameRef` when it asks for a login token for `userId`, posting it
 * to `elementOrigin` only, so the token never travels in a URL. A request from another window or
 * origin is ignored; one for another user, or a failed mint, is answered with none.
 */
export function useMatrixLoginTokenAnswer(
  frameRef: RefObject<HTMLIFrameElement | null>,
  elementOrigin: string | undefined,
  userId: string
): void {
  useEffect(() => {
    if (!elementOrigin || !userId) return;
    const onMessage = async (event: MessageEvent) => {
      const frame = frameRef.current?.contentWindow;
      if (!frame || event.source !== frame || event.origin !== elementOrigin || !isLoginTokenRequest(event.data)) {
        return;
      }
      const loginToken = event.data.user === userId ? await fetchMatrixLoginToken() : null;
      frame.postMessage({ type: LOGIN_TOKEN_ANSWER, loginToken }, elementOrigin);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameRef, elementOrigin, userId]);
}
