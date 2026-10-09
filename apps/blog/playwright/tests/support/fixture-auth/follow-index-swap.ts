import type { Page } from '@playwright/test';
import type { BroadcastInterceptor, InterceptedBroadcast } from './broadcast-interceptor';

const FIXTURE_PROXY_PORT = 8200;
const FOLLOW_BLOG_TYPE = 'blog';

interface FollowEntry {
  follower: string;
  following: string;
  what: string[];
}

function isFollowBroadcast(call: InterceptedBroadcast, follower: string, following: string): boolean {
  const op = (call.params as { trx?: { operations?: unknown[] } } | undefined)?.trx?.operations?.[0] as
    | { type?: string; value?: { id?: string; json?: string } }
    | undefined;
  if (op?.type !== 'custom_json_operation' || op.value?.id !== 'follow') return false;
  try {
    const [tag, payload] = JSON.parse(op.value.json ?? '') as [unknown, Partial<FollowEntry>];
    return (
      tag === 'follow' &&
      payload?.follower === follower &&
      payload.following === following &&
      Array.isArray(payload.what) &&
      payload.what.includes(FOLLOW_BLOG_TYPE)
    );
  } catch {
    return false;
  }
}

/** Inserts `entry` into a `get_following` result, keeping the chain's ascending-by-name order. */
function withFollowEntry(responseBody: unknown, entry: FollowEntry): unknown {
  const result = (responseBody as { result?: unknown } | null)?.result;
  if (!Array.isArray(result)) return responseBody;
  const rows = result as FollowEntry[];
  if (rows.some((row) => row.following === entry.following)) return responseBody;
  const merged = [...rows, entry].sort((a, b) => a.following.localeCompare(b.following));
  return { ...(responseBody as object), result: merged };
}

/**
 * Makes the replayed chain "index" a follow once the browser has broadcast it:
 * every later browser `condenser_api.get_following(follower, …, 'blog', …)` gets
 * `following` merged into its recorded result. Before the broadcast, and for any
 * other call, the request falls through to earlier routes (e.g. the broadcast
 * interceptor) unchanged.
 *
 * Install AFTER `installBroadcastInterceptor` — Playwright runs the most recently
 * registered route first. Server-side (SSR/RSC) calls are not routed by the page,
 * so they keep serving the recording, which models a lagging Hivemind node.
 */
export async function installFollowIndexSwap(
  page: Page,
  broadcast: BroadcastInterceptor,
  follow: { follower: string; following: string },
  port: number = FIXTURE_PROXY_PORT
): Promise<void> {
  const entry: FollowEntry = { ...follow, what: [FOLLOW_BLOG_TYPE] };
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(port),
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.fallback();
      let body: { method?: unknown; params?: unknown } | null = null;
      try {
        body = request.postDataJSON();
      } catch {
        return route.fallback();
      }
      const params = Array.isArray(body?.params) ? body.params : [];
      const indexed = broadcast.calls.some((call) =>
        isFollowBroadcast(call, follow.follower, follow.following)
      );
      if (
        !indexed ||
        body?.method !== 'condenser_api.get_following' ||
        params[0] !== follow.follower ||
        params[2] !== FOLLOW_BLOG_TYPE
      ) {
        return route.fallback();
      }
      const upstream = await route.fetch();
      return route.fulfill({
        status: upstream.status(),
        contentType: 'application/json',
        body: JSON.stringify(withFollowEntry(await upstream.json(), entry))
      });
    }
  );
}
