import { useEffect, useRef } from 'react';

interface ChatTokenRequestState {
  isIframeLoaded: boolean;
  isLoggedIn: boolean;
  username: string;
  chatAuthToken: string;
}

/**
 * Calls `requestToken` once the chat iframe is loaded and a signed-in user holds no chat token,
 * whichever of the two happens first. It is called at most once per signed-in user: not again on
 * re-render, while the request is in flight, or after it failed; signing out or switching to
 * another account allows a new request.
 */
export function useChatTokenRequest(
  { isIframeLoaded, isLoggedIn, username, chatAuthToken }: ChatTokenRequestState,
  requestToken: () => void
): void {
  const requestedForRef = useRef<string | null>(null);
  // The caller's callback may change identity on every render; it must not re-trigger a request
  const requestTokenRef = useRef(requestToken);
  requestTokenRef.current = requestToken;

  useEffect(() => {
    if (!isLoggedIn) {
      requestedForRef.current = null;
      return;
    }
    if (chatAuthToken || !isIframeLoaded || requestedForRef.current === username) return;
    requestedForRef.current = username;
    requestTokenRef.current();
  }, [isIframeLoaded, isLoggedIn, username, chatAuthToken]);
}
