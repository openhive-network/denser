import { expect, type Page } from '@playwright/test';

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
 * Shape of a Hive `vote_operation` payload inside a broadcast's
 * `params.trx.operations[0]`. Fields we actually assert on match the
 * test plan's TX-04 requirements (voter, author, permlink, weight).
 */
export interface VoteOperationExpectations {
  voter: string;
  weight: number;
  author?: string;
  permlink?: string;
}

/**
 * TX-04 validator. Pulls the single operation out of a captured broadcast
 * and asserts it's a `vote_operation` with the expected fields. Lets tests
 * catch regressions in the produced transaction shape (e.g. MR !1041)
 * beyond the "some broadcast fired" level.
 */
export function expectVoteOperation(
  call: InterceptedBroadcast,
  expected: VoteOperationExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const operations = trx?.operations;
  expect(operations, 'trx should include operations').toBeDefined();
  expect(
    operations?.length,
    'vote broadcast should carry exactly one operation'
  ).toBe(1);

  const op = operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be vote_operation').toBe(
    'vote_operation'
  );

  const value = op?.value as
    | { voter?: string; author?: string; permlink?: string; weight?: number }
    | undefined;
  expect(value?.voter, 'vote.voter').toBe(expected.voter);
  expect(value?.weight, 'vote.weight').toBe(expected.weight);
  if (expected.author !== undefined) {
    expect(value?.author, 'vote.author').toBe(expected.author);
  }
  if (expected.permlink !== undefined) {
    expect(value?.permlink, 'vote.permlink').toBe(expected.permlink);
  }
}

/**
 * Shape of a Hive `comment_operation` payload. Covers both new comments
 * (auto-generated permlink `re-<parent>-<timestamp>`) and edits (explicit
 * permlink supplied by caller). For new comments pass `permlinkPattern`
 * (the timestamp suffix is non-deterministic); for edits pass `permlink`.
 */
export interface CommentOperationExpectations {
  parent_author: string;
  parent_permlink: string;
  author: string;
  body?: string;
  permlink?: string;
  permlinkPattern?: RegExp;
}

/**
 * TX-01 / TX-03 validator. Asserts the broadcast carries a single
 * `comment_operation` with the expected fields. Wax sometimes appends a
 * `comment_options_operation` (for rewards != default) — we only inspect
 * `operations[0]`, the comment itself.
 */
export function expectCommentOperation(
  call: InterceptedBroadcast,
  expected: CommentOperationExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const operations = trx?.operations;
  expect(operations, 'trx should include operations').toBeDefined();
  expect(operations?.length, 'comment broadcast should carry >=1 operation')
    .toBeGreaterThanOrEqual(1);

  const op = operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be comment_operation').toBe(
    'comment_operation'
  );

  const value = op?.value as
    | {
        parent_author?: string;
        parent_permlink?: string;
        author?: string;
        permlink?: string;
        body?: string;
      }
    | undefined;
  expect(value?.parent_author, 'comment.parent_author').toBe(
    expected.parent_author
  );
  expect(value?.parent_permlink, 'comment.parent_permlink').toBe(
    expected.parent_permlink
  );
  expect(value?.author, 'comment.author').toBe(expected.author);
  if (expected.body !== undefined) {
    expect(value?.body, 'comment.body').toBe(expected.body);
  }
  if (expected.permlink !== undefined) {
    expect(value?.permlink, 'comment.permlink').toBe(expected.permlink);
  }
  if (expected.permlinkPattern !== undefined) {
    expect(value?.permlink ?? '', 'comment.permlink (pattern)').toMatch(
      expected.permlinkPattern
    );
  }
}

/** TX-15: `delete_comment_operation` payload. */
export interface DeleteCommentOperationExpectations {
  author: string;
  permlink: string;
}

export function expectDeleteCommentOperation(
  call: InterceptedBroadcast,
  expected: DeleteCommentOperationExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const op = trx?.operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be delete_comment_operation').toBe(
    'delete_comment_operation'
  );

  const value = op?.value as
    | { author?: string; permlink?: string }
    | undefined;
  expect(value?.author, 'delete_comment.author').toBe(expected.author);
  expect(value?.permlink, 'delete_comment.permlink').toBe(expected.permlink);
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
