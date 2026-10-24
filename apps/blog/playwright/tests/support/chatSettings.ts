import type { Page } from '@playwright/test';

/**
 * Sets chat client settings (`REACT_APP_<key>`) for `page` by appending them to `__ENV.js`. The
 * fixture build's CSP frames and reaches no chat origin, so a spec using this bypasses it.
 */
export async function configureChat(page: Page, settings: Record<string, string>): Promise<void> {
  await page.route('**/__ENV.js?*', async (route) => {
    const response = await route.fetch();
    const assignments = Object.entries(settings)
      .map(([key, value]) => `window.__ENV.REACT_APP_${key} = ${JSON.stringify(value)};`)
      .join('\n');
    await route.fulfill({ response, body: `${await response.text()}\n${assignments}` });
  });
}
