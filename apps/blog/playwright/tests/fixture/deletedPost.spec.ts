import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';

/**
 * A post or comment its author deleted answers 404 with a page that says so and links the author,
 * not the generic not-found page; a post that never existed still gets the generic one. A mention
 * notification keeps linking a deleted reply as `/@author/permlink`, which /api/resolve-post sends
 * to the deleted post's page.
 *
 * The recording (`deletedPost`) is hand-written over notificationLinks: hivemind's answers for a
 * deleted post (-31999 "was deleted") and a missing one (-32602 "does not exist").
 *
 * Tagged @basepath: .aidev/run-fixture-e2e.sh runs it again under FIXTURE_BASE_PATH.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- deletedPost
 */

test.use({ fixtureTestName: 'deletedPost' });

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const AUTHOR = 'lampwork';
const DELETED_PERMLINK = 'tp1622';
const MISSING_PERMLINK = 'no-such-post-1786';

function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

test.describe('Deleted post page', { tag: '@basepath' }, () => {
  test('DEL-POST-01 — a deleted reply says its author deleted it, with a 404', async ({ page }) => {
    const response = await page.goto(withBase(`/@${AUTHOR}/${DELETED_PERMLINK}`));

    expect(response?.status()).toBe(404);
    expect(new URL(page.url()).pathname).toBe(withBase(`/deleted/@${AUTHOR}/${DELETED_PERMLINK}`));
    const deleted = page.getByTestId('deleted-post-page');
    await expect(deleted).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });
    await expect(deleted.getByRole('heading', { name: 'This post or comment was deleted' })).toBeVisible();
    await expect(deleted).toContainText(`@${AUTHOR}`);
    await expect(page.getByTestId('deleted-post-author-link')).toHaveAttribute('href', withBase(`/@${AUTHOR}`));
    await expect(page.getByTestId('not-found-page')).toHaveCount(0);
  });

  test('DEL-POST-02 — the deleted post page is translated', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL ?? '' }]);

    const response = await page.goto(withBase(`/deleted/@${AUTHOR}/${DELETED_PERMLINK}`));

    expect(response?.status()).toBe(404);
    await expect(
      page.getByTestId('deleted-post-page').getByRole('heading', { name: 'Ten post lub komentarz został usunięty' })
    ).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });
  });

  test('DEL-POST-03 — a post that never existed still shows the generic not-found page', async ({ page }) => {
    for (const path of [`/@${AUTHOR}/${MISSING_PERMLINK}`, `/deleted/@${AUTHOR}/${MISSING_PERMLINK}`]) {
      const response = await page.goto(withBase(path));

      expect(response?.status(), path).toBe(404);
      await expect(page.getByTestId('not-found-page'), path).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });
      await expect(page.getByTestId('deleted-post-page'), path).toHaveCount(0);
    }
  });
});
