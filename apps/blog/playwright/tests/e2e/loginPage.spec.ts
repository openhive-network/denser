import { expect, test } from '@playwright/test';
import { TIMEOUTS } from '../support/constants';

// /login is where /api/oauth/authorize sends signed-out users (OAuth2 sign-in).
// It used to fail with HTTP 500 on every request (#958).
test.describe('Login page tests', () => {
  for (const path of ['/login', '/login?oauth_return=true']) {
    test(`${path} renders the sign-in form`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response).not.toBeNull();
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId('username-input')).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    });
  }
});
