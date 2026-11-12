import type { Page } from '@playwright/test';
import {
  broadcastInterceptorOf,
  type BroadcastInterceptor,
  type InterceptedBroadcast
} from '../../../../../playwright/support/broadcast/interceptor.ts';
import { FIXTURE_API_PORT } from './apiStub';
import { BROADCAST_METHODS } from './broadcastInterceptor';

/** The English title of the toast for a node's insufficient-funds rejection (smart-signer locale). */
export const BALANCE_TOO_LOW_TITLE = 'Your balance is too low for this amount, so nothing was sent.';

/** hived's untagged adjust_balance assertion, as a node answers a transfer above the account's balance. */
const ADJUST_BALANCE_REJECTION = {
  code: -32003,
  message:
    'Assert Exception:false: Account gtg does not have sufficient funds for balance adjustment. ' +
    'Required: 2000.000 HIVE, Available: 1234.567 HIVE',
  data: {
    code: 10,
    name: 'assert_exception',
    message: 'Assert Exception',
    stack: [
      {
        // wax only parses an exception whose context has every field hived sends.
        context: {
          level: 'error',
          file: 'database.cpp',
          line: 3920,
          method: 'adjust_balance',
          hostname: '',
          thread_name: 'th_a',
          timestamp: '2026-11-12T17:00:00'
        },
        format: 'Account ${a} does not have sufficient funds for balance adjustment. Required: ${r}, Available: ${b}',
        data: { a: 'gtg', r: '2000.000 HIVE', b: '1234.567 HIVE' }
      }
    ]
  }
};

/**
 * Answers every broadcast to the stub node with ADJUST_BALANCE_REJECTION, as a node does for an
 * amount the client let through, and records each one. Call after `installBroadcastInterceptor`,
 * which still answers `verify_authority`: this route runs first.
 */
export async function rejectBroadcastsForBalance(page: Page): Promise<BroadcastInterceptor> {
  const calls: InterceptedBroadcast[] = [];
  await page.route(
    (url) => url.hostname === '127.0.0.1' && url.port === String(FIXTURE_API_PORT),
    (route) => {
      let body: { method?: unknown; params?: unknown; id?: unknown } | null;
      try {
        body = route.request().postDataJSON();
      } catch {
        return route.fallback();
      }
      if (typeof body?.method !== 'string' || !BROADCAST_METHODS.has(body.method)) return route.fallback();
      const rpcId = typeof body.id === 'number' || typeof body.id === 'string' ? body.id : undefined;
      calls.push({ method: body.method, params: body.params, rpcId, at: Date.now() });
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jsonrpc: '2.0', id: rpcId ?? 1, error: ADJUST_BALANCE_REJECTION })
      });
    }
  );
  return broadcastInterceptorOf(calls);
}
