import type { Page } from '@playwright/test';

const FIXTURE_PROXY_PORT = 8200;

/**
 * JSON-RPC methods whose responses depend on a freshly-built transaction
 * (ref_block_num, expiration, signature over the posted tx). The
 * fixture-proxy keys recordings by `sha256(method + params)`, so a recorded
 * reply will never match on replay — and mainnet responses are wrong for
 * our key-less seeded user anyway (`verify_authority` rightly reports
 * "missing posting authority" because the test WIF isn't on the real
 * account).
 *
 * We intercept these at the Playwright level and return a canned success,
 * bypassing the fixture-proxy entirely. Read-only calls still flow through
 * the proxy and get recorded/replayed normally.
 *
 * Each entry maps to the JSON-RPC `result` shape the wax client expects:
 *  - `broadcast_transaction*`: `null` — optimistic UI already applied.
 *  - `verify_authority`: `{ valid: true }` — pretend the signature checks
 *    out so the client proceeds to broadcast.
 */
const CANNED_RESULTS: Record<string, unknown> = {
  'network_broadcast_api.broadcast_transaction': null,
  'condenser_api.broadcast_transaction': null,
  'network_broadcast_api.broadcast_transaction_synchronous': null,
  'condenser_api.broadcast_transaction_synchronous': null,
  'database_api.verify_authority': { valid: true },
  'condenser_api.verify_authority': true
};

const TRACKED_MUTATION_METHODS = new Set<string>([
  'network_broadcast_api.broadcast_transaction',
  'condenser_api.broadcast_transaction',
  'network_broadcast_api.broadcast_transaction_synchronous',
  'condenser_api.broadcast_transaction_synchronous'
]);

export interface InterceptedBroadcast {
  method: string;
  params: unknown;
  rpcId: number | string | undefined;
  at: number;
}

export interface BroadcastInterceptor {
  calls: InterceptedBroadcast[];
  /** Wait until at least `count` mutation calls have been intercepted. */
  waitForCount: (count: number, timeoutMs?: number) => Promise<void>;
}

/**
 * Installs a `page.route` on the fixture-proxy port that intercepts
 * mutation RPCs and returns a canned success. Non-mutation POSTs fall
 * through untouched (and reach the fixture-proxy as usual).
 *
 * Call once per test, before `page.goto(...)`.
 */
export async function installBroadcastInterceptor(
  page: Page,
  port: number = FIXTURE_PROXY_PORT
): Promise<BroadcastInterceptor> {
  const calls: InterceptedBroadcast[] = [];

  // Function matcher rather than a glob pattern: `http://localhost:8200/**`
  // did not reliably match the bare-root `http://localhost:8200/` that the
  // fixture-proxy listens on, so no route callback fired at all.
  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(port),
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        return route.continue();
      }

      let body: { method?: unknown; params?: unknown; id?: unknown } | null = null;
      try {
        body = request.postDataJSON();
      } catch {
        return route.continue();
      }

      const method = typeof body?.method === 'string' ? body.method : '';

      // Trace everything that hits the proxy port so silent failures are
      // visible in the test output.
      console.log(`[interceptor] POST ${method || '<no-method>'}`);

      if (!(method in CANNED_RESULTS)) {
        return route.continue();
      }

      const rpcId =
        typeof body?.id === 'number' || typeof body?.id === 'string'
          ? body.id
          : undefined;

      // Only broadcast-class methods count as "mutations" for assertions.
      // verify_authority is a pre-broadcast check — important to stub but
      // not what tests are proving happened.
      if (TRACKED_MUTATION_METHODS.has(method)) {
        calls.push({
          method,
          params: body?.params,
          rpcId,
          at: Date.now()
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: rpcId ?? 1,
          result: CANNED_RESULTS[method]
        })
      });
    }
  );

  return {
    calls,
    async waitForCount(count, timeoutMs = 10000) {
      const deadline = Date.now() + timeoutMs;
      while (calls.length < count && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (calls.length < count) {
        throw new Error(
          `Timed out waiting for ${count} mutation RPC(s); saw ${calls.length}`
        );
      }
    }
  };
}
