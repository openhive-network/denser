/**
 * Captures the transactions a page broadcasts and answers them with a canned success, so the
 * blog's and the wallet's fixture specs can assert what an action would have sent to the chain
 * without a chain. Read-only calls are left to whatever serves the API (fixture proxy, stub node).
 */
import type { Page, Route } from '@playwright/test';
import { testTimeout } from '../timeouts.ts';

/** The JSON-RPC methods that send a transaction: what a spec counts as "broadcast". */
export const BROADCAST_METHODS: ReadonlySet<string> = new Set<string>([
  'network_broadcast_api.broadcast_transaction',
  'condenser_api.broadcast_transaction',
  'network_broadcast_api.broadcast_transaction_synchronous',
  'condenser_api.broadcast_transaction_synchronous'
]);

/**
 * The JSON-RPC `result` answered for each intercepted method. Their real answers depend on a
 * freshly signed transaction, so no recording or stub can serve them:
 *  - `broadcast_transaction*`: `null`, the node's answer to an accepted transaction.
 *  - `verify_authority`: valid, so a signer proceeds to broadcast with a key no account holds.
 */
export const CANNED_RESULTS: Readonly<Record<string, unknown>> = {
  'network_broadcast_api.broadcast_transaction': null,
  'condenser_api.broadcast_transaction': null,
  'network_broadcast_api.broadcast_transaction_synchronous': null,
  'condenser_api.broadcast_transaction_synchronous': null,
  'database_api.verify_authority': { valid: true },
  'condenser_api.verify_authority': true
};

export interface InterceptedBroadcast {
  method: string;
  /** The JSON-RPC params as sent; for `network_broadcast_api` `{ trx, max_block_age }`. */
  params: unknown;
  rpcId: number | string | undefined;
  at: number;
}

export interface BroadcastInterceptor {
  calls: InterceptedBroadcast[];
  /** Wait until at least `count` broadcasts have been intercepted. */
  waitForCount: (count: number, timeoutMs?: number) => Promise<void>;
}

/** Fulfils `route` with the canned JSON-RPC answer to `method`, which must be in CANNED_RESULTS. */
export const fulfillCanned = (route: Route, method: string, rpcId: number | string | undefined) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId ?? 1, result: CANNED_RESULTS[method] })
  });

/** The BroadcastInterceptor view of `calls`, which the route handler appends to. */
export function broadcastInterceptorOf(calls: InterceptedBroadcast[]): BroadcastInterceptor {
  return {
    calls,
    async waitForCount(count, timeoutMs = testTimeout('broadcast-count', 10000)) {
      const deadline = Date.now() + timeoutMs;
      while (calls.length < count && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
      }
      if (calls.length < count) {
        throw new Error(`Timed out waiting for ${count} mutation RPC(s); saw ${calls.length}`);
      }
    }
  };
}

/**
 * Routes the page's JSON-RPC POSTs to URLs `isApiUrl` accepts: a method in CANNED_RESULTS is
 * answered with its canned result (and recorded when it is a broadcast); any other request goes
 * on to the API unchanged. Call once per test, before `page.goto(...)`.
 */
export async function installBroadcastInterceptor(
  page: Page,
  isApiUrl: (url: URL) => boolean
): Promise<BroadcastInterceptor> {
  const calls: InterceptedBroadcast[] = [];
  await page.route(isApiUrl, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();

    let body: { method?: unknown; params?: unknown; id?: unknown } | null;
    try {
      body = request.postDataJSON();
    } catch {
      return route.continue();
    }
    const method = typeof body?.method === 'string' ? body.method : '';
    if (!(method in CANNED_RESULTS)) return route.continue();

    const rpcId = typeof body?.id === 'number' || typeof body?.id === 'string' ? body.id : undefined;
    if (BROADCAST_METHODS.has(method)) calls.push({ method, params: body?.params, rpcId, at: Date.now() });
    return fulfillCanned(route, method, rpcId);
  });
  return broadcastInterceptorOf(calls);
}
