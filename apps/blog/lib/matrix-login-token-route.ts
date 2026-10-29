import type { IncomingHttpHeaders } from 'http';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { ChatProvider } from '@hive/ui/config/chat';
import type { MatrixLoginTokenResult } from '@smart-signer/lib/auth/matrix-login-token';
import type { User } from '@smart-signer/types/common';
import { isEligibleForChat, type ChatEligibilityRules } from './chat-eligibility.ts';

export interface MatrixLoginTokenRouteSettings {
  provider: ChatProvider;
  /** Whether Synapse's admin API is configured (an admin token, homeserver and server name) */
  minting: boolean;
  eligibility: ChatEligibilityRules;
  /** The signed-in user of the request's server session, if any */
  sessionUser: (req: NextApiRequest, res: NextApiResponse) => Promise<User | undefined>;
  mint: (username: string) => Promise<MatrixLoginTokenResult>;
}

type Answer = { loginToken: string } | { error: string; retry_after_ms?: number };

/** The longest wait a rate-limited answer passes on, a little over Synapse's minute per token */
const MAX_RETRY_AFTER_MS = 70_000;
const MS_PER_SECOND = 1000;

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function hostOf(origin: string): string | undefined {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
}

/**
 * A request the browser made from a page of this site: `Sec-Fetch-Site: same-origin`, or, from a
 * browser that does not send it, an `Origin` on the host the request was made to.
 */
function isSameOrigin(headers: IncomingHttpHeaders): boolean {
  const fetchSite = headerValue(headers, 'sec-fetch-site');
  if (fetchSite) return fetchSite === 'same-origin';
  const origin = headerValue(headers, 'origin');
  const host = headerValue(headers, 'x-forwarded-host')?.split(',')[0]?.trim() || headerValue(headers, 'host');
  return !!origin && !!host && hostOf(origin) === host;
}

/**
 * `POST /api/chat/matrix-login-token`: a Synapse login token for the chat user the server signed
 * in, with which the session page signs Element in without the SSO redirects. Answers `200
 * { loginToken }`; `404` when `mint` leaves the user without a Matrix account and `503` when no
 * token could be minted, on which the session page signs in through SSO; `429 { retry_after_ms }` (and
 * `Retry-After`) when Synapse rate-limits the mint, with its wait capped at 70 s; `403` to a cross-origin request or a
 * user who may not chat; `401` without a server sign-in; `404` unless Matrix is the chat provider
 * with an admin token. Never cached.
 */
export function matrixLoginTokenHandler(settings: MatrixLoginTokenRouteSettings): NextApiHandler<Answer> {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (settings.provider !== 'matrix' || !settings.minting) {
      res.status(404).json({ error: 'Matrix chat is not in use' });
      return;
    }
    if (!isSameOrigin(req.headers)) {
      res.status(403).json({ error: 'Cross-origin request' });
      return;
    }
    const user = await settings.sessionUser(req, res);
    if (!user?.isLoggedIn || !user.username || !user.authenticateOnBackend) {
      res.status(401).json({ error: 'Not signed in on the server' });
      return;
    }
    if (!isEligibleForChat(user, settings.eligibility)) {
      res.status(403).json({ error: 'Not eligible for chat' });
      return;
    }
    const result = await settings.mint(user.username);
    if (result.kind === 'token') {
      res.status(200).json({ loginToken: result.loginToken });
    } else if (result.kind === 'unknown-user') {
      res.status(404).json({ error: 'No Matrix account yet' });
    } else if (result.kind === 'rate-limited') {
      const retryAfterMs = Math.min(Math.max(Math.ceil(result.retryAfterMs), 0), MAX_RETRY_AFTER_MS);
      res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / MS_PER_SECOND)));
      res.status(429).json({ error: 'Rate-limited', retry_after_ms: retryAfterMs });
    } else {
      res.status(503).json({ error: 'No login token' });
    }
  };
}
