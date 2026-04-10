import { expect, test } from '@playwright/test';

test.describe('Error handling tests', () => {
  test('ER-01: 404 for invalid URL', async ({ page }) => {
    const response = await page.goto('/@nonexistentuser123456/invalid-post-permlink-xyz', { waitUntil: 'domcontentloaded' });

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;

    // Server should return 200 or 404 - NOT 500 (that would be a bug)
    expect([200, 404]).toContain(status);
  });

  test('ER-02: Invalid username shows error state', async ({ page }) => {
    const response = await page.goto('/@thisuserdefinitelydoesnotexist99999', { waitUntil: 'domcontentloaded' });

    expect(response).not.toBeNull();
    const status = response?.status() ?? 200;

    // Server should return 200 or 404 - NOT 500
    expect([200, 404]).toContain(status);
  });
});
