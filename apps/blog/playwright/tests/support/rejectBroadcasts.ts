import type { Page } from '@playwright/test';

const FIXTURE_PROXY_PORT = 8200;

/** Answers `verify_authority` as valid and every broadcast with `error`; returns the broadcast count. */
export async function rejectBroadcasts(page: Page, error: unknown): Promise<{ count: number }> {
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
