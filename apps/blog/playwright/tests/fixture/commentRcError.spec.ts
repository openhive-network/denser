import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import {
  VOTER,
  gotoPostLoggedIn,
  openReplyEditor,
  postReplyTrigger,
  typeIntoReplyEditor,
  submitReply
} from '../support/commentingContext';

/**
 * A reply the node rejects for lack of Resource Credits is reported once: one RC message toast,
 * and the editor stays open with the draft for a retry. Reuses CMT-01's recording (`commenting`)
 * and flow; the broadcast is answered with hived's rejection instead of the canned success.
 *
 * The toaster shows one toast at a time, so a second report would replace the first rather than
 * stack: the spec counts every RC message the page mounts, not the ones visible at the end.
 */

const FIXTURE_PROXY_PORT = 8200;

/** hived's rejection of a transaction its payer lacks the RC for, trimmed of its stack. */
const NOT_ENOUGH_RC_ERROR = {
  code: -32003,
  message: `payer has not enough RC mana for transaction: {"tx_info":{"usage":{"rc":"2133680829"},"payer":"${VOTER}"},"rc_current":"1000"}`,
  data: { code: 4100000, name: 'not_enough_rc_exception', message: 'payer has not enough RC mana for transaction' }
};

test.use({ fixtureTestName: 'commenting', authenticatedUser: {} });

/** Answers `verify_authority` as valid and every broadcast with `error`; returns the broadcast count. */
async function rejectBroadcasts(page: Page, error: unknown): Promise<{ count: number }> {
  const broadcasts = { count: 0 };
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') return route.continue();
      let body: { method?: unknown; id?: unknown } | null;
      try {
        body = request.postDataJSON();
      } catch {
        return route.continue();
      }
      const method = typeof body?.method === 'string' ? body.method : '';
      const id = typeof body?.id === 'number' || typeof body?.id === 'string' ? body.id : 1;
      if (method === 'database_api.verify_authority') {
        return route.fulfill({ json: { jsonrpc: '2.0', id, result: { valid: true } } });
      }
      if (/broadcast_transaction(_synchronous)?$/.test(method)) {
        broadcasts.count++;
        return route.fulfill({ json: { jsonrpc: '2.0', id, error } });
      }
      return route.continue();
    }
  );
  return broadcasts;
}

/** Counts, in `window.__rcMessagesMounted`, every RC message element the page adds. */
async function countRcMessages(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counter = window as unknown as { __rcMessagesMounted: number };
    counter.__rcMessagesMounted = 0;
    const selector = '[data-testid="not-enough-rc-message"]';
    new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(selector)) counter.__rcMessagesMounted++;
          counter.__rcMessagesMounted += node.querySelectorAll(selector).length;
        });
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

const rcMessagesMounted = (page: Page) =>
  page.evaluate(() => (window as unknown as { __rcMessagesMounted: number }).__rcMessagesMounted);

test('CMT-RC-01 — a reply rejected for lack of RC is reported with one toast', async ({ page }) => {
  await countRcMessages(page);
  const broadcasts = await rejectBroadcasts(page, NOT_ENOUGH_RC_ERROR);
  await gotoPostLoggedIn(page);

  await openReplyEditor(postReplyTrigger(page), page.getByTestId('reply-editor'));
  const body = 'CMT-RC-01 fixture-test reply short of RC';
  await typeIntoReplyEditor(page, body);
  await submitReply(page);

  await expect(page.getByTestId('not-enough-rc-message')).toBeVisible();
  expect(broadcasts.count).toBeGreaterThan(0);
  // A second report would land right after the first: give it the time to show up
  await page.waitForTimeout(1000);
  expect(await rcMessagesMounted(page)).toBe(1);
  await expect(page.getByTestId('error-toast-content')).toHaveCount(0);
  await expect(page.getByTestId('reply-editor')).toBeVisible();
});
