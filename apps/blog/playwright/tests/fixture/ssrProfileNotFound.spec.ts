import { test, expect } from '../support/fixture-proxy-test';

/**
 * A profile URL answers 404 only when the account lookup succeeded and found no account. When the
 * lookup itself fails (an upstream 429 / 5xx / node blip), the account may well exist: the page
 * answers 503 with a "couldn't load this profile" message and a retry, never a 404 and never a 500.
 * `failRequests` drops every `database_api.find_accounts` call, so the server's retries fail too.
 *
 * Level: browser (`next dev` renders a failed server render's error boundary on the client). Replay only.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrProfileNotFound
 */

test.use({ fixtureTestName: 'userProfileTabs' });

// A valid account name the userProfileTabs recording answers with no account.
const NONEXISTENT_PROFILE_PATH = '/@nosuchuser1078';
const PROFILE_PATH = '/@hiveio';

test('SAFE-13 — a nonexistent account renders the not-found page with a 404', async ({ page }) => {
  const response = await page.goto(NONEXISTENT_PROFILE_PATH);

  expect(response?.status()).toBe(404);
  await expect(page.getByTestId('not-found-page')).toBeVisible();
  await expect(page.getByTestId('profile-load-error')).toHaveCount(0);
});

test('SAFE-14 — a failed account lookup renders the profile load error with a 503, not a 404', async ({
  page,
  fixtureProxy
}) => {
  const restore = fixtureProxy.failRequests(({ method }) => method === 'database_api.find_accounts');
  try {
    const response = await page.goto(PROFILE_PATH);

    expect(response?.status()).toBe(503);
    expect(response?.headers()['retry-after']).toBe('30');
    const error = page.getByTestId('profile-load-error');
    await expect(error.getByRole('heading', { name: "Couldn't load this profile" })).toBeVisible();
    await expect(error.getByTestId('service-unavailable-retry')).toBeVisible();
    await expect(page.getByTestId('not-found-page')).toHaveCount(0);
  } finally {
    restore();
  }
});
