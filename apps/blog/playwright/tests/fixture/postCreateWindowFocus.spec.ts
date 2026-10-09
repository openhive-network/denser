import type { Page, Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { gotoCommunityNewPostLoggedIn } from '../support/postCreationContext';

/**
 * Returning to the editor tab must not refetch community or subscription
 * data: each refetch re-renders the whole post form while the user types.
 *
 * The page clock is advanced past the default one-minute staleTime before
 * the focus events, so a query that still refetches on window focus would
 * fire a request here.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateWindowFocus
 */

const WATCHED_METHODS = ['bridge.get_community', 'bridge.list_all_subscriptions'];
const PAST_STALE_TIME = '05:00';
const QUIET_PERIOD_MS = 1500;

function rpcMethod(request: Request): string | null {
  if (request.method() !== 'POST' || !request.url().startsWith('http://localhost:8200')) return null;
  try {
    const body = request.postDataJSON();
    return typeof body?.method === 'string' ? body.method : null;
  } catch {
    return null;
  }
}

/** Collects the watched JSON-RPC methods the page requests. */
function recordWatchedCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (request) => {
    const method = rpcMethod(request);
    if (method && WATCHED_METHODS.includes(method)) calls.push(method);
  });
  return calls;
}

async function simulateTabReturn(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
}

test.use({ fixtureTestName: 'postCreateCommunity', authenticatedUser: {} });

test.describe('Post editor window focus', () => {
  test('POST-FOCUS-01: returning to the tab refetches no community or subscription data', async ({ page }) => {
    await page.clock.install();
    const calls = recordWatchedCalls(page);
    await gotoCommunityNewPostLoggedIn(page);

    await expect.poll(() => calls.includes('bridge.get_community')).toBe(true);
    await expect.poll(() => calls.includes('bridge.list_all_subscriptions')).toBe(true);
    await page.waitForLoadState('networkidle');

    const callsBeforeFocus = calls.length;
    await page.clock.fastForward(PAST_STALE_TIME);
    await simulateTabReturn(page);
    await page.waitForTimeout(QUIET_PERIOD_MS);

    expect(calls.slice(callsBeforeFocus)).toEqual([]);
  });
});
