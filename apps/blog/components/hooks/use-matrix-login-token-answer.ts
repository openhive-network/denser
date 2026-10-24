import { useEffect, type RefObject } from 'react';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { csrfHeaderName } from '@smart-signer/lib/csrf-protection';
import { appApiPath } from '@ui/lib/app-api-path';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

// The session page's protocol (stack/matrix/chat-origin/denser-session.html)
const LOGIN_TOKEN_REQUEST = 'denser-matrix-login-token-request';
const LOGIN_TOKEN_ANSWER = 'denser-matrix-login-token';
/** Within the session page's wait, after which it signs in through SSO anyway */
const LOGIN_TOKEN_TIMEOUT_MS = 7_000;

function isLoginTokenRequest(data: unknown): data is { type: string; user: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    Reflect.get(data, 'type') === LOGIN_TOKEN_REQUEST &&
    typeof Reflect.get(data, 'user') === 'string'
  );
}

/** A login token denser's server mints for the signed-in user, or null for the SSO */
async function fetchLoginToken(): Promise<string | null> {
  try {
    const answer: unknown = await fetchJson(
      appApiPath('/api/chat/matrix-login-token'),
      { method: 'POST', credentials: 'same-origin', headers: [[csrfHeaderName, '1']] },
      LOGIN_TOKEN_TIMEOUT_MS
    );
    const loginToken = typeof answer === 'object' && answer !== null ? Reflect.get(answer, 'loginToken') : null;
    return typeof loginToken === 'string' ? loginToken : null;
  } catch (error) {
    // Expected for a user without a Matrix account yet; the SSO creates it
    logger.info('No Matrix login token, signing in through SSO: %o', error instanceof Error ? error.message : error);
    return null;
  }
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
      const loginToken = event.data.user === userId ? await fetchLoginToken() : null;
      frame.postMessage({ type: LOGIN_TOKEN_ANSWER, loginToken }, elementOrigin);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [frameRef, elementOrigin, userId]);
}
