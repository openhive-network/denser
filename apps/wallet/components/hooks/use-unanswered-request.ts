import { useEffect, useState } from 'react';

// Long enough to read and approve a wallet prompt; a later answer still replaces the note.
const UNANSWERED_REQUEST_TIMEOUT_MS = 20_000;
// Approving the prompt returns the focus a moment before the extension's answer arrives.
const FOCUS_RETURN_GRACE_MS = 2_000;

/**
 * Whether the wallet extension request numbered `requestNumber` is still unanswered after a bounded
 * wait, or shortly after the user came back to the page from the extension's window. An extension
 * may answer a request whose prompt was left open only once a newer request supersedes it.
 *
 * @param requestNumber the pending request's number, a new one for each request; null when none is pending
 */
export const useUnansweredRequest = (requestNumber: number | null): boolean => {
  const [unansweredNumber, setUnansweredNumber] = useState<number | null>(null);

  useEffect(() => {
    if (requestNumber === null) return;
    const markUnanswered = () => setUnansweredNumber(requestNumber);
    const timeouts = [setTimeout(markUnanswered, UNANSWERED_REQUEST_TIMEOUT_MS)];
    const onFocus = () => timeouts.push(setTimeout(markUnanswered, FOCUS_RETURN_GRACE_MS));
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      timeouts.forEach(clearTimeout);
    };
  }, [requestNumber]);

  return requestNumber !== null && unansweredNumber === requestNumber;
};
