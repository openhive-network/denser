import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';

/**
 * User Lists fixture tests — Test Plan §1.5 (ANON-LIST-01..04).
 *
 * Record:  pnpm --filter @hive/blog test:fixture:record
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'userLists' });

const STABLE_USER = 'hiveio';
const USER_WITH_ENTRIES = 'hive.blog';

const listPages = [
  { id: 'ANON-LIST-01', slug: 'muted', title: /muted/i },
  { id: 'ANON-LIST-02', slug: 'blacklisted', title: /blacklist/i },
  { id: 'ANON-LIST-03', slug: 'followed_muted_lists', title: /follow.*muted/i },
  { id: 'ANON-LIST-04', slug: 'followed_blacklists', title: /follow.*blacklist/i }
];

test.describe('User Lists — anonymous view (§1.5)', () => {
  for (const { id, slug, title } of listPages) {
    test(`${id}: @${STABLE_USER}/lists/${slug} renders container or empty state`, async ({
      page
    }) => {
      await page.goto(`/@${STABLE_USER}/lists/${slug}`, { waitUntil: 'commit' });

      const area = page.locator('[data-testid="user-list-area"]');
      await expect(area).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

      const titleEl = area.locator('[data-testid="user-list-title"]');
      await expect(titleEl).toBeVisible();
      await expect(titleEl).toHaveText(title);

      const list = area.locator('[data-testid="user-list-container"]');
      await expect(list).toBeVisible();

      const items = list.locator('[data-testid="user-list-item"]');
      const emptyState = list.locator('[data-testid="user-list-empty"]');
      const itemCount = await items.count();
      if (itemCount === 0) {
        await expect(emptyState).toBeVisible();
      } else {
        expect(itemCount).toBeGreaterThan(0);
      }

      await expect(page.getByText(/add account to list/i)).toHaveCount(0);
      await expect(page.getByText(/reset all lists/i)).toHaveCount(0);
    });
  }

  test(`ANON-LIST-02 variant: @${USER_WITH_ENTRIES}/lists/blacklisted shows items`, async ({
    page
  }) => {
    await page.goto(`/@${USER_WITH_ENTRIES}/lists/blacklisted`, { waitUntil: 'commit' });

    const items = page.locator('[data-testid="user-list-item"]');
    await expect(items.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    const firstName = items.first().locator('[data-testid="user-list-item-name"]');
    await expect(firstName).toBeVisible();
    await expect(firstName).not.toHaveText('');
  });
});
