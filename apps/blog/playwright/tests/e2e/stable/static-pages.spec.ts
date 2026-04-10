import { expect, test } from '@playwright/test';
import { TIMEOUTS } from '../../support/constants';

test.describe('Static pages tests', () => {
  test('SP-01: FAQ page loads', async ({ page }) => {
    await page.goto('/faq.html', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/faq.html');
    await expect(page.getByRole('heading', { name: 'Hive.blog FAQ' })).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE
    });
  });

  test('SP-02: TOS and Privacy pages load', async ({ page }) => {
    // Terms of Service
    await page.goto('/tos.html', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/tos.html');
    await page.waitForLoadState('domcontentloaded');

    // Privacy Policy
    await page.goto('/privacy.html', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/privacy.html');
    await expect(page.locator('h1').getByText('Privacy Policy')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE
    });
  });
});
