import { expect, type Page } from '@playwright/test';

const FIXTURE_PROXY_PORT = 8200;

/**
 * Methods WorkerBee polls while waiting for block inclusion after an
 * `observe: true` broadcast. We can stub these per-test so WorkerBee
 * sees the captured transaction land in a synthetic block, resolves
 * its listener, and lets the app proceed to the success path
 * (toast, router.push). See `installBroadcastInterceptor`'s
 * `confirmInBlock` option.
 */
const WORKERBEE_POLL_METHODS = new Set<string>([
  'database_api.get_dynamic_global_properties',
  'block_api.get_block',
  'block_api.get_block_range'
]);

interface CapturedTrxState {
  trx: Record<string, unknown> | null;
  txId: string | null;
  legacyTxId: string | null;
}

interface BlockConfirmationState {
  /** Wax chain instance used to compute trx ID from the captured signed trx. */
  chain: unknown | null;
  /** Most recently captured broadcast — synthetic blocks reference this. */
  captured: CapturedTrxState;
  /** Monotonic block number we report; increments on every dgpo poll
   * after a broadcast is captured so WorkerBee sees a "new" block to fetch. */
  fakeHeadBlockNum: number;
  /** Whether we've already returned a block containing the captured trx.
   * After delivery WorkerBee resolves and stops polling — we just keep
   * advancing the head if it polls again to avoid stale-block errors. */
  delivered: boolean;
}

/**
 * Build a `database_api.get_dynamic_global_properties` response that
 * looks healthy enough for WorkerBee's DynamicGlobalPropertiesCollector
 * (reads current_witness, head_block_number, time, downvote_pool_percent,
 * head_block_id).
 */
function synthDgpo(headBlockNum: number): Record<string, unknown> {
  const time = new Date().toISOString().replace(/\.\d+Z$/, '');
  return {
    head_block_number: headBlockNum,
    head_block_id: blockIdFromNum(headBlockNum),
    time,
    current_witness: 'fixture-witness',
    downvote_pool_percent: 2500,
    // Other fields wax/workerbee might touch — fill with realistic defaults
    // so deserialization doesn't blow up on missing/null values.
    current_aslot: headBlockNum * 2,
    participation_count: 128,
    last_irreversible_block_num: Math.max(0, headBlockNum - 20),
    available_account_subsidies: 0,
    hbd_interest_rate: 0,
    maximum_block_size: 65536,
    required_actions_partition_percent: 0,
    delegation_return_period: 432000,
    reverse_auction_seconds: 300,
    early_voting_seconds: 86400,
    mid_voting_seconds: 172800,
    sps_fund_percent: 1000,
    sps_interval_ledger: { amount: '0', precision: 3, nai: '@@000000013' },
    smt_creation_fee: { amount: '0', precision: 3, nai: '@@000000013' },
    dhf_interval_ledger: { amount: '0', precision: 3, nai: '@@000000013' },
    total_pow: 0,
    num_pow_witnesses: 0,
    virtual_supply: { amount: '0', precision: 3, nai: '@@000000021' },
    current_supply: { amount: '0', precision: 3, nai: '@@000000021' },
    init_hbd_supply: { amount: '0', precision: 3, nai: '@@000000013' },
    current_hbd_supply: { amount: '0', precision: 3, nai: '@@000000013' },
    total_vesting_fund_hive: { amount: '0', precision: 3, nai: '@@000000021' },
    total_vesting_shares: { amount: '0', precision: 6, nai: '@@000000037' },
    total_reward_fund_hive: { amount: '0', precision: 3, nai: '@@000000021' },
    total_reward_shares2: '0',
    pending_rewarded_vesting_shares: { amount: '0', precision: 6, nai: '@@000000037' },
    pending_rewarded_vesting_hive: { amount: '0', precision: 3, nai: '@@000000021' },
    hbd_print_rate: 10000,
    hbd_stop_percent: 1000,
    hbd_start_percent: 900,
    next_maintenance_time: '1970-01-01T00:00:00',
    last_budget_time: '1970-01-01T00:00:00',
    next_daily_maintenance_time: '1970-01-01T00:00:00',
    content_reward_percent: 6500,
    vesting_reward_percent: 1500,
    proposal_fund_percent: 0,
    dhf_interval_ledger_percent: 0,
    sps_interval_ledger_percent: 0,
    target_votes_per_period: 144,
    average_block_size: 0
  };
}

/** 40-hex deterministic block id derived from the block number. */
function blockIdFromNum(n: number): string {
  const head = n.toString(16).padStart(8, '0');
  return head + 'deadbeef'.repeat(4);
}

/**
 * Build a `block_api.get_block` response containing the captured trx.
 * WorkerBee's BlockCollector reads `transactions[]` and `transaction_ids[]`
 * to build a `transactionsPerId` Map; the listener then asserts the
 * captured `txId` is in that map. Other block fields just need to
 * satisfy createTransactionFromJson + BlockHeaderClassifier deserializers.
 */
function synthBlockWithTrx(
  blockNum: number,
  state: BlockConfirmationState
): Record<string, unknown> {
  const time = new Date().toISOString().replace(/\.\d+Z$/, '');
  const transactions = state.captured.trx ? [state.captured.trx] : [];
  const transactionIds = state.captured.txId ? [state.captured.txId] : [];
  return {
    previous: blockIdFromNum(blockNum - 1),
    timestamp: time,
    witness: 'fixture-witness',
    transaction_merkle_root: '0'.repeat(40),
    extensions: [],
    witness_signature:
      '20' + '0'.repeat(128), // 65-byte sig in hex
    transactions,
    block_id: blockIdFromNum(blockNum),
    signing_key: 'STM7zmnfQpukRrPv2v3kRH7DcYPSBeUzEuzwhJBcb7P3oV1jvDEdb',
    signatures: [],
    transaction_ids: transactionIds
  };
}

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

/**
 * Shape of a Hive `comment_options_operation` payload — the second op
 * that `BlogPostOperation` always emits alongside `comment_operation`.
 * Covers the §2.3 Payout & Rewards combinations: max_accepted_payout
 * (encoded as NaiAsset HBD, amount = `data.maxAcceptedPayout * 1000`),
 * percent_hbd (0 for 100% PU, 10000 for 50/50), allow_votes /
 * allow_curation_rewards (always true from this client), and
 * beneficiaries (basis-point weights, sorted alphabetically by account).
 *
 * The `permlink` field is matched the same way as comment_operation —
 * either pass `permlink` for edits or `permlinkPattern` for the
 * `re-<parent>-<timestamp>` / slugified-title shapes produced on
 * create.
 *
 * `beneficiaries: []` asserts the extensions array is empty. A non-empty
 * array asserts an exact, ordered match (post-sort, so callers should
 * supply already-sorted-by-account expectations).
 */
export interface CommentOptionsOperationExpectations {
  author: string;
  permlink?: string;
  permlinkPattern?: RegExp;
  max_accepted_payout: { amount: string; precision: number; nai: string };
  percent_hbd: number;
  allow_votes?: boolean;
  allow_curation_rewards?: boolean;
  beneficiaries: { account: string; weight: number }[];
}

/**
 * Walk `extensions[0]` and extract its beneficiary list regardless of the
 * wire form wax serializes it as. We've seen three shapes in the wild:
 *
 *   1. Modern wax tagged-union:
 *        { type: 'comment_payout_beneficiaries',
 *          value: { beneficiaries: [...] } }
 *   2. Bare protobuf:
 *        { comment_payout_beneficiaries: { beneficiaries: [...] } }
 *   3. Legacy tuple:
 *        [0, { beneficiaries: [...] }]
 *
 * Tests don't care which form wax happens to use — they care that the
 * beneficiary list matches. Centralising the extraction here keeps the
 * 15 PAY-xx specs focused on the values, not the encoding.
 */
function extractBeneficiariesFromExtensions(
  extensions: unknown
): { account: string; weight: number }[] {
  if (!Array.isArray(extensions) || extensions.length === 0) return [];
  const ext = extensions[0];

  const fromBareOrTagged = (() => {
    if (ext && typeof ext === 'object') {
      const obj = ext as Record<string, unknown>;
      // Form 1: { type, value: { beneficiaries } }
      if (typeof obj.type === 'string' && obj.value && typeof obj.value === 'object') {
        const v = obj.value as { beneficiaries?: unknown };
        if (Array.isArray(v.beneficiaries)) return v.beneficiaries;
      }
      // Form 2: { comment_payout_beneficiaries: { beneficiaries } }
      const wrapped = obj.comment_payout_beneficiaries as
        | { beneficiaries?: unknown }
        | undefined;
      if (wrapped && Array.isArray(wrapped.beneficiaries)) {
        return wrapped.beneficiaries;
      }
    }
    return undefined;
  })();
  if (fromBareOrTagged) return fromBareOrTagged as { account: string; weight: number }[];

  // Form 3: [0, { beneficiaries }]
  if (Array.isArray(ext) && ext.length === 2) {
    const payload = ext[1] as { beneficiaries?: unknown } | undefined;
    if (payload && Array.isArray(payload.beneficiaries)) {
      return payload.beneficiaries as { account: string; weight: number }[];
    }
  }
  return [];
}

/**
 * Default `comment_options` shape that wax's `BlogPostOperation`
 * substitutes when the caller's settings match Hive's protocol
 * defaults. When *every* commentOptions field equals these, wax skips
 * emitting `comment_options_operation` entirely (see
 * `@hiveio/wax/.../detailed/index.js` CommentOperation.finalize, which
 * pushes `comment_options_operation` only if `!deepEqual(default, this.commentOptions)`).
 * Note: HIVE protocol default for max_accepted_payout is `"1000000000"`
 * (i.e. 1,000,000 HBD × 1000 milli-units), percent_hbd is 10000,
 * both allow flags true, and no beneficiaries.
 */
const DEFAULT_COMMENT_OPTIONS = {
  max_accepted_payout: { amount: '1000000000', precision: 3, nai: '@@000000013' },
  percent_hbd: 10000,
  allow_votes: true,
  allow_curation_rewards: true,
  beneficiaries: [] as { account: string; weight: number }[]
} as const;

/**
 * TX-02 validator. `BlogPostOperation` emits two patterns:
 *   - operations.length === 2: comment_operation + comment_options_operation
 *     (any non-default payout/rewards/beneficiaries setting)
 *   - operations.length === 1: comment_operation only (everything is at
 *     Hive protocol defaults — wax optimizes out the redundant op)
 *
 * This validator handles both. If wax omitted op[1], the caller's
 * `expected` must equal `DEFAULT_COMMENT_OPTIONS` — otherwise the test
 * passes spuriously. If wax emitted op[1], we assert exactly on its
 * fields.
 *
 * Use alongside `expectCommentOperation` on the same call: each §2.3
 * spec checks TX-01 (comment_operation) for sanity (author, permlink,
 * parent_*) and TX-02 (this) for the matrix dimension under test.
 */
export function expectCommentOptionsOperation(
  call: InterceptedBroadcast,
  expected: CommentOptionsOperationExpectations,
  options: { operationIndex?: number } = {}
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const operations = trx?.operations;
  expect(operations, 'trx should include operations').toBeDefined();

  // §2.3 (create) bundles comment + comment_options into one trx at
  // operations[0] and operations[1]. §3 EDIT-03a's updatePostOptions
  // ships as a SEPARATE transaction, so the comment_options_operation
  // lives at operations[0] in that second trx. Callers default to
  // index 1 (preserves §2.3 behaviour); pass 0 for edit-mode use.
  const opIndex = options.operationIndex ?? 1;
  const op = operations?.[opIndex] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;

  // Wax omitted comment_options_operation — only valid when the caller's
  // expectations match the protocol defaults. If they don't, we'd be
  // silently passing a spec that should have asserted a non-default
  // op[1], so explicitly fail in that case.
  if (!op || op.type !== 'comment_options_operation') {
    expect(
      expected.max_accepted_payout,
      'wax omitted comment_options — expected max_accepted_payout must equal default'
    ).toEqual(DEFAULT_COMMENT_OPTIONS.max_accepted_payout);
    expect(
      expected.percent_hbd,
      'wax omitted comment_options — expected percent_hbd must equal default'
    ).toBe(DEFAULT_COMMENT_OPTIONS.percent_hbd);
    expect(
      expected.allow_votes ?? true,
      'wax omitted comment_options — allow_votes must be default true'
    ).toBe(true);
    expect(
      expected.allow_curation_rewards ?? true,
      'wax omitted comment_options — allow_curation_rewards must be default true'
    ).toBe(true);
    expect(
      expected.beneficiaries,
      'wax omitted comment_options — beneficiaries must be empty'
    ).toEqual([]);
    return;
  }

  const value = op?.value as
    | {
        author?: string;
        permlink?: string;
        max_accepted_payout?: { amount?: string; precision?: number; nai?: string };
        percent_hbd?: number;
        allow_votes?: boolean;
        allow_curation_rewards?: boolean;
        extensions?: unknown[];
      }
    | undefined;
  expect(value?.author, 'comment_options.author').toBe(expected.author);
  if (expected.permlink !== undefined) {
    expect(value?.permlink, 'comment_options.permlink').toBe(expected.permlink);
  }
  if (expected.permlinkPattern !== undefined) {
    expect(value?.permlink ?? '', 'comment_options.permlink (pattern)').toMatch(
      expected.permlinkPattern
    );
  }

  // NaiAsset shape — wax emits HBD as { amount: "<milli-HBD>", precision: 3,
  // nai: "@@000000013" }. `data.maxAcceptedPayout * 1000` is the unit
  // conversion the editor performs before handing the value to wax
  // (see use-post-form-actions.ts:100).
  expect(value?.max_accepted_payout, 'comment_options.max_accepted_payout').toEqual(
    expected.max_accepted_payout
  );
  expect(value?.percent_hbd, 'comment_options.percent_hbd').toBe(expected.percent_hbd);
  expect(value?.allow_votes, 'comment_options.allow_votes').toBe(
    expected.allow_votes ?? true
  );
  expect(
    value?.allow_curation_rewards,
    'comment_options.allow_curation_rewards'
  ).toBe(expected.allow_curation_rewards ?? true);

  // Beneficiaries: the editor multiplies UI percent by 100 (basis points),
  // filters out zero-weight entries, and sorts alphabetically by account
  // (see use-post-form-actions.ts:141-149). Callers pass already-sorted
  // expectations; we compare for exact equality.
  const actualBeneficiaries = extractBeneficiariesFromExtensions(value?.extensions);
  if (expected.beneficiaries.length === 0) {
    // Empty: extensions array may be `[]` OR carry a wrapper with empty
    // beneficiaries — both are functionally identical for §2.3 purposes.
    expect(actualBeneficiaries, 'comment_options.beneficiaries (empty)').toEqual([]);
  } else {
    expect(actualBeneficiaries, 'comment_options.beneficiaries').toEqual(
      expected.beneficiaries
    );
  }
}

/**
 * TX-05: reblog payload — a `custom_json_operation` whose `id` is `"follow"`
 * and whose `json` parses to `["reblog", {account, author, permlink}]`.
 *
 * (Wax encodes reblog through `FollowOperation.reblog(...)` — the wire form
 * is custom_json with required_posting_auths=[account]. We don't assert on
 * required_posting_auths separately because `account` already covers it.)
 */
export interface ReblogOperationExpectations {
  account: string;
  author: string;
  permlink: string;
}

export function expectReblogOperation(
  call: InterceptedBroadcast,
  expected: ReblogOperationExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const op = trx?.operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be custom_json_operation').toBe(
    'custom_json_operation'
  );

  const value = op?.value as
    | {
        id?: string;
        json?: string;
        required_posting_auths?: string[];
      }
    | undefined;
  expect(value?.id, 'custom_json.id').toBe('follow');
  expect(
    value?.required_posting_auths,
    'custom_json.required_posting_auths'
  ).toEqual([expected.account]);

  const rawJson = value?.json ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(
      `custom_json.json should be JSON-parseable; got: ${rawJson}`
    );
  }
  expect(Array.isArray(parsed), 'custom_json.json should be a tuple').toBe(true);
  const [tag, payload] = parsed as [unknown, unknown];
  expect(tag, 'custom_json.json[0]').toBe('reblog');
  expect(payload, 'custom_json.json[1]').toEqual({
    account: expected.account,
    author: expected.author,
    permlink: expected.permlink
  });
}

/**
 * TX-04 (custom_json id="follow"): follow / unfollow / mute / unmute /
 * blacklist / unblacklist / follow_blacklist / follow_muted / reset_*.
 *
 * All social-graph operations go through `FollowOperation.*` in
 * `@hiveio/wax` and emit a single `custom_json_operation` whose `id`
 * is `"follow"` and whose `json` parses to
 * `["follow", { follower, following, what }]`.
 *
 * Wax `followBodyBuilder` shapes `following` two ways:
 *   - **single string** when called with NO `...otherBlogs` rest args
 *     (e.g. `follow`, `unfollow`, `unmute`, all per-row remove
 *     operations, and the reset operations which pin `'all'`)
 *   - **array `[blog, ...otherBlogs]`** when called with rest args
 *     (e.g. `mute`/`blacklistBlog`/`followBlacklistBlog`/`followMutedBlog`
 *     wrappers in `transactionService` split their `otherBlogs` arg and
 *     pass them on, so even a single-account add produces `['', 'name']`)
 *
 * `what` is always a 1-element array — wax wraps the action string in
 * `[what]` unconditionally. Values come from `EFollowActions` in wax:
 * `'blog'`, `''` (unfollow / unmute), `'ignore'`, `'blacklist'`,
 * `'unblacklist'`, `'follow_blacklist'`, `'unfollow_blacklist'`,
 * `'follow_muted'`, `'unfollow_muted'`, `'reset_muted_list'`,
 * `'reset_blacklist'`, `'reset_follow_blacklist'`,
 * `'reset_follow_muted_list'`.
 */
export interface FollowCustomJsonExpectations {
  follower: string;
  following: string | string[];
  what: string[];
}

export function expectFollowCustomJson(
  call: InterceptedBroadcast,
  expected: FollowCustomJsonExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const op = trx?.operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be custom_json_operation').toBe(
    'custom_json_operation'
  );

  const value = op?.value as
    | {
        id?: string;
        json?: string;
        required_posting_auths?: string[];
      }
    | undefined;
  expect(value?.id, 'custom_json.id').toBe('follow');
  expect(
    value?.required_posting_auths,
    'custom_json.required_posting_auths'
  ).toEqual([expected.follower]);

  const rawJson = value?.json ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(
      `custom_json.json should be JSON-parseable; got: ${rawJson}`
    );
  }
  expect(Array.isArray(parsed), 'custom_json.json should be a tuple').toBe(true);
  const [tag, payload] = parsed as [unknown, unknown];
  expect(tag, 'custom_json.json[0]').toBe('follow');
  expect(payload, 'custom_json.json[1]').toEqual({
    follower: expected.follower,
    following: expected.following,
    what: expected.what
  });
}

/**
 * TX-08 / TX-09 (custom_json id="community"): subscribe / unsubscribe /
 * setRole / setUserTitle / pinPost / unpinPost / flagPost / mutePost /
 * unmutePost / updateProps.
 *
 * All community-management operations go through `CommunityOperation.*` in
 * `@hiveio/wax` and emit a single `custom_json_operation` whose `id` is
 * `"community"` and whose `json` parses to `[action, payload]` — where
 * `action` is the verb (`"subscribe"`, `"setRole"`, …) and `payload` is
 * the operation-specific object that wax serialises (e.g.
 * `{ community }`, `{ community, account, role }`,
 * `{ community, account, permlink }`, etc.).
 *
 * Assertion is **subset on payload**: only the keys present in
 * `expected.payload` are checked. The chain occasionally adds defaulted
 * keys (`notes: ""` for flag/mute ops when the caller omits notes) and
 * we want specs to pass when those defaults appear. Pass the exact wire
 * shape if you need a stricter check.
 *
 * `required_posting_auths` is asserted equal to `[expected.required_auth]`
 * (the seeded user — same contract as `expectFollowCustomJson`).
 */
export interface CommunityCustomJsonExpectations {
  required_auth: string;
  action: string;
  payload: Record<string, unknown>;
}

export function expectCommunityCustomJson(
  call: InterceptedBroadcast,
  expected: CommunityCustomJsonExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const op = trx?.operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be custom_json_operation').toBe(
    'custom_json_operation'
  );

  const value = op?.value as
    | {
        id?: string;
        json?: string;
        required_posting_auths?: string[];
      }
    | undefined;
  expect(value?.id, 'custom_json.id').toBe('community');
  expect(
    value?.required_posting_auths,
    'custom_json.required_posting_auths'
  ).toEqual([expected.required_auth]);

  const rawJson = value?.json ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(
      `custom_json.json should be JSON-parseable; got: ${rawJson}`
    );
  }
  expect(Array.isArray(parsed), 'custom_json.json should be a tuple').toBe(true);
  const [tag, payload] = parsed as [unknown, unknown];
  expect(tag, 'custom_json.json[0]').toBe(expected.action);

  // Subset assertion — chain may pad in defaulted keys (e.g. notes="").
  expect(payload, 'custom_json.json[1] should be an object').toBeDefined();
  expect(typeof payload, 'custom_json.json[1] type').toBe('object');
  const actualPayload = payload as Record<string, unknown>;
  for (const [key, expectedValue] of Object.entries(expected.payload)) {
    expect(actualPayload[key], `payload.${key}`).toEqual(expectedValue);
  }
}

/**
 * §14 NOTIF-03 — "mark all notifications as read".
 *
 * `transactionService.markAllNotificationAsRead(date)` emits ONE
 * `custom_json_operation` with id `"notify"` and a JSON tuple of shape
 * `["setLastRead", { date }]` (see transaction/index.ts). The `date` is
 * `new Date().toISOString()` minus the trailing ".SSSZ" (19 chars), so it
 * cannot be pinned — we assert its format instead.
 */
export interface NotifyCustomJsonExpectations {
  /** Expected `required_posting_auths[0]` — the seeded user. */
  required_auth: string;
}

export function expectNotifyCustomJson(
  call: InterceptedBroadcast,
  expected: NotifyCustomJsonExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const op = trx?.operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be custom_json_operation').toBe(
    'custom_json_operation'
  );

  const value = op?.value as
    | { id?: string; json?: string; required_posting_auths?: string[] }
    | undefined;
  expect(value?.id, 'custom_json.id').toBe('notify');
  expect(
    value?.required_posting_auths,
    'custom_json.required_posting_auths'
  ).toEqual([expected.required_auth]);

  const rawJson = value?.json ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(
      `custom_json.json should be JSON-parseable; got: ${rawJson}`
    );
  }
  expect(Array.isArray(parsed), 'custom_json.json should be a tuple').toBe(true);
  const [action, payload] = parsed as [unknown, { date?: unknown }];
  expect(action, 'custom_json.json[0]').toBe('setLastRead');

  // `date` is time-based (new Date().toISOString().slice(0, -5)) so we assert
  // the wire format rather than a fixed value: "YYYY-MM-DDTHH:mm:ss".
  expect(typeof payload?.date, 'payload.date type').toBe('string');
  expect(
    payload?.date as string,
    'payload.date should be a millisecond-stripped ISO timestamp'
  ).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
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
 * TX-10: profile update payload — an `account_update2_operation` whose
 * `posting_json_metadata` is a JSON string of `{ profile: { ... } }`.
 *
 * Wire shape (from `transactionService.updateProfile`):
 *
 *   account_update2_operation:
 *     account: <username>
 *     json_metadata: ""
 *     posting_json_metadata: JSON.stringify({
 *       profile: {
 *         profile_image, cover_image, name, about, location, website,
 *         witness_owner, witness_description, blacklist_description,
 *         muted_list_description, version: 2
 *       }
 *     })
 *     extensions: []
 *
 * The settings form preloads ALL fields from `getAccountFull(username)`
 * and re-sends them on every save — so a "change only display name"
 * broadcast still carries every other profile field at its previous
 * value. Tests therefore assert a **subset match** on `profile`: only
 * the keys present in `expected.profile` are checked; other keys are
 * ignored. Pass `version: 2` explicitly when the upgrade flag matters.
 */
export interface AccountUpdate2OperationExpectations {
  account: string;
  profile: Partial<{
    name: string;
    about: string;
    location: string;
    website: string;
    profile_image: string;
    cover_image: string;
    blacklist_description: string;
    muted_list_description: string;
    witness_owner: string;
    witness_description: string;
    version: number;
  }>;
}

export function expectAccountUpdate2Operation(
  call: InterceptedBroadcast,
  expected: AccountUpdate2OperationExpectations
): void {
  const trx = (call.params as { trx?: unknown } | undefined)?.trx as
    | { operations?: unknown[] }
    | undefined;
  expect(trx, 'broadcast params should include trx').toBeDefined();

  const op = trx?.operations?.[0] as
    | { type?: string; value?: Record<string, unknown> }
    | undefined;
  expect(op?.type, 'operation.type should be account_update2_operation').toBe(
    'account_update2_operation'
  );

  const value = op?.value as
    | { account?: string; posting_json_metadata?: string; json_metadata?: string }
    | undefined;
  expect(value?.account, 'account_update2.account').toBe(expected.account);

  const rawMeta = value?.posting_json_metadata ?? '';
  let parsed: { profile?: Record<string, unknown> };
  try {
    parsed = JSON.parse(rawMeta) as { profile?: Record<string, unknown> };
  } catch {
    throw new Error(
      `posting_json_metadata should be JSON-parseable; got: ${rawMeta}`
    );
  }

  expect(parsed.profile, 'posting_json_metadata.profile').toBeDefined();
  for (const [key, expectedValue] of Object.entries(expected.profile)) {
    expect(parsed.profile?.[key], `profile.${key}`).toBe(expectedValue);
  }
}

/**
 * Installs a `page.route` on the fixture-proxy port that intercepts
 * mutation RPCs and returns a canned success. Non-mutation POSTs fall
 * through untouched (and reach the fixture-proxy as usual).
 *
 * Call once per test, before `page.goto(...)`.
 */
export interface InstallBroadcastInterceptorOptions {
  /**
   * If true, additionally stubs the RPCs WorkerBee polls during
   * `observe: true` block confirmation, so `transactionService.post(…,
   * { observe: true })` resolves immediately after the broadcast is
   * captured. This unlocks the post-creation success path (toast,
   * router.push, post page render) for fixture specs.
   *
   * Mechanism: after we capture a broadcast, we use wax to compute the
   * tx ID, then stub `database_api.get_dynamic_global_properties` to
   * advance head_block_number on every poll, and stub `block_api.get_block`
   * to return a synthetic block containing the captured trx + its ID.
   * WorkerBee's `onTransactionIds(txId).onBlock()` listener finds the
   * tx in the synthetic block and resolves bot.broadcast(...).
   *
   * Off by default — keeps existing fixture specs (which assert only
   * on the captured broadcast and don't exercise the success path)
   * unchanged.
   */
  confirmInBlock?: boolean;
  /**
   * Hot-swap subsequent `bridge.get_post` / `bridge.get_discussion` responses
   * for the given (author, permlink) **after** a `comment_operation` or
   * `delete_comment_operation` broadcast lands. The patch reflects the
   * fields the broadcast carries:
   *   - comment_operation → title, body, json_metadata (tags) on the post
   *   - delete_comment_operation → bridge.get_post returns a JSON-RPC
   *     error so the UI renders the "not found" branch
   *
   * Why: `usePostMutation.onSuccess` calls `scheduleValidatedRefetch` which
   * re-hits `bridge.get_post`. The fixture-proxy serves the same static
   * JSON regardless of what was broadcast, so the post-edit specs would
   * see the **old** title/body after submit. With this swap, the refetch
   * picks up the edited values and the UI re-renders correctly — letting
   * specs assert on the rendered post page without re-recording fixtures.
   *
   * Note: comment_options_operation (payout settings) is NOT applied —
   * those fields (`max_accepted_payout`, `percent_hbd`) are baseline
   * properties of the post but aren't usually surfaced in the rendered
   * detail page; broadcast-level assertion (TX-02) covers them already.
   */
  postEditSwap?: {
    author: string;
    permlink: string;
  };
  /**
   * Hot-swap subsequent `database_api.find_accounts` responses for the
   * given `account` **after** an `account_update2_operation` broadcast
   * lands. The patch overwrites `accounts[i].posting_json_metadata` (the
   * JSON string `getAccountFull` parses to derive `profile.*`) with the
   * exact bytes the broadcast carried.
   *
   * Why: `useUpdateProfileMutation.onSuccess` schedules
   * `queryClient.invalidateQueries(['profileData', user.username])` 4
   * seconds after a successful broadcast. The invalidation triggers a
   * refetch of `getAccountFull`, which re-issues `database_api.find_accounts`.
   * Without this swap, the refetch returns the stale fixture and the
   * profile header reverts to its pre-submit values — masking whether
   * the chain actually accepted our update.
   *
   * `onSettled` also writes the cache optimistically (without going
   * through the API) before the refetch — so the swap is what keeps the
   * profile header consistent past the 4-second invalidation timer, not
   * what makes it update in the first place.
   */
  profileUpdateSwap?: {
    account: string;
  };
  /**
   * Hot-swap subsequent `bridge.get_community` responses for the given
   * community **after** an `updateProps` community custom_json broadcast
   * lands, applying the broadcast's `props` (title / about / description /
   * flag_text / is_nsfw / lang) to the community result.
   *
   * Why: `useUpdateCommunityMutation.onSuccess` invalidates
   * `['community', name]` 4 seconds after a successful broadcast, refetching
   * `bridge.get_community`. The fixture-proxy serves the pre-edit recording,
   * so without this swap the community page reverts to its old title/about.
   * The swap keeps the page consistent with what was just edited — the same
   * role `profileUpdateSwap` plays for the settings form.
   */
  communityUpdateSwap?: {
    community: string;
  };
  /**
   * Hot-swap subsequent `bridge.get_post` / `bridge.get_discussion` so a post's
   * `author_title` reflects a `setUserTitle` community custom_json after it
   * lands. `useUserTitleMutation` has NO optimistic update — it only
   * invalidates `['postData', user, permlink]` / `['discussionData', permlink]`
   * — and the fixture refetch returns the recorded (old) title, so without this
   * the author-title badge never updates. Patches `author_title` (to the
   * broadcast's title) on entries authored by `account`.
   */
  userTitleSwap?: {
    account: string;
  };
}

interface PostEditPatch {
  title?: string;
  body?: string;
  json_metadata?: string;
  deleted?: boolean;
}

function applyPostEditPatch(
  entry: Record<string, unknown> | null | undefined,
  patch: PostEditPatch
): void {
  if (!entry) return;
  if (patch.title !== undefined) entry.title = patch.title;
  if (patch.body !== undefined) entry.body = patch.body;
  if (patch.json_metadata !== undefined) {
    // The wire form is sometimes a string (Hive node) and sometimes an
    // object (Hivemind). Mirror `generate-edit-variants.mjs` and respect
    // whichever shape the recording captured for this entry.
    const existing = entry.json_metadata;
    if (typeof existing === 'object' && existing !== null) {
      try {
        entry.json_metadata = JSON.parse(patch.json_metadata);
      } catch {
        entry.json_metadata = patch.json_metadata;
      }
    } else {
      entry.json_metadata = patch.json_metadata;
    }
  }
}

function patchFindAccountsResponse(
  responseBody: unknown,
  account: string,
  patch: { posting_json_metadata: string }
): unknown {
  if (typeof responseBody !== 'object' || responseBody === null) return responseBody;
  const root = responseBody as { result?: { accounts?: Array<Record<string, unknown>> } };
  const accounts = root.result?.accounts;
  if (!Array.isArray(accounts)) return responseBody;
  for (const acc of accounts) {
    if (acc.name === account) {
      acc.posting_json_metadata = patch.posting_json_metadata;
    }
  }
  return responseBody;
}

function patchGetCommunityResponse(
  responseBody: unknown,
  community: string,
  props: Record<string, unknown>
): unknown {
  if (typeof responseBody !== 'object' || responseBody === null) return responseBody;
  const root = responseBody as { result?: Record<string, unknown> };
  const result = root.result;
  if (result && typeof result === 'object' && result.name === community) {
    for (const key of ['title', 'about', 'description', 'flag_text', 'is_nsfw', 'lang'] as const) {
      if (props[key] !== undefined) result[key] = props[key];
    }
  }
  return responseBody;
}

function patchAuthorTitleResponse(
  method: string,
  responseBody: unknown,
  account: string,
  title: string
): unknown {
  if (typeof responseBody !== 'object' || responseBody === null) return responseBody;
  const result = (responseBody as { result?: unknown }).result;
  if (!result || typeof result !== 'object') return responseBody;
  if (method === 'bridge.get_post') {
    const post = result as Record<string, unknown>;
    if (post.author === account) post.author_title = title;
  } else if (method === 'bridge.get_discussion') {
    const map = result as Record<string, Record<string, unknown>>;
    for (const key of Object.keys(map)) {
      if (map[key]?.author === account) map[key].author_title = title;
    }
  }
  return responseBody;
}

function patchPostResponse(
  method: string,
  responseBody: unknown,
  target: { author: string; permlink: string },
  patch: PostEditPatch
): unknown {
  if (typeof responseBody !== 'object' || responseBody === null) return responseBody;
  const body = responseBody as { result?: unknown };
  const result = body.result;
  if (!result || typeof result !== 'object') return responseBody;

  if (method === 'bridge.get_post') {
    const post = result as Record<string, unknown>;
    if (post.author === target.author && post.permlink === target.permlink) {
      applyPostEditPatch(post, patch);
    }
    return responseBody;
  }

  if (method === 'bridge.get_discussion') {
    const map = result as Record<string, Record<string, unknown>>;
    const key = `${target.author}/${target.permlink}`;
    if (map[key]) {
      applyPostEditPatch(map[key], patch);
    }
    return responseBody;
  }

  return responseBody;
}

export async function installBroadcastInterceptor(
  page: Page,
  port: number = FIXTURE_PROXY_PORT,
  options: InstallBroadcastInterceptorOptions = {}
): Promise<BroadcastInterceptor> {
  const calls: InterceptedBroadcast[] = [];
  const confirmInBlock = options.confirmInBlock ?? false;
  const postEditSwap = options.postEditSwap;
  let postEditPatch: PostEditPatch | null = null;
  const profileUpdateSwap = options.profileUpdateSwap;
  let profileUpdatePatch: { posting_json_metadata: string } | null = null;
  const communityUpdateSwap = options.communityUpdateSwap;
  let communityUpdatePatch: Record<string, unknown> | null = null;
  const userTitleSwap = options.userTitleSwap;
  let userTitlePatch: { account: string; title: string } | null = null;

  // Lazy-init the wax chain only when block confirmation is requested —
  // it loads WASM and is ~hundreds of ms; not worth the overhead for
  // specs that just want broadcast capture.
  const blockState: BlockConfirmationState = {
    chain: null,
    captured: { trx: null, txId: null, legacyTxId: null },
    fakeHeadBlockNum: 0,
    delivered: false
  };
  if (confirmInBlock) {
    const wax = await import('@hiveio/wax');
    blockState.chain = await wax.createHiveChain();
  }

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
      const rpcId =
        typeof body?.id === 'number' || typeof body?.id === 'string'
          ? body.id
          : undefined;

      // Trace everything that hits the proxy port so silent failures are
      // visible in the test output.
      console.log(`[interceptor] POST ${method || '<no-method>'}`);

      // Post-edit hot-swap. Once a comment_operation / delete_comment_operation
      // for the configured (author, permlink) has been captured, intercept
      // any subsequent bridge.get_post / bridge.get_discussion for the same
      // post: fetch the recorded response from the fixture-proxy, then patch
      // title / body / json_metadata in place (or return a JSON-RPC error
      // for the delete path) before fulfilling. usePostMutation.onSuccess's
      // scheduleValidatedRefetch picks up the patched data, the cache
      // updates, and the UI re-renders with the edited content.
      if (
        postEditSwap &&
        postEditPatch &&
        (method === 'bridge.get_post' || method === 'bridge.get_discussion')
      ) {
        const params = body?.params as
          | { author?: string; permlink?: string }
          | undefined;
        if (
          params?.author === postEditSwap.author &&
          params?.permlink === postEditSwap.permlink
        ) {
          if (postEditPatch.deleted && method === 'bridge.get_post') {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: rpcId ?? 1,
                error: { code: -32602, message: 'Post not found' }
              })
            });
          }
          const upstream = await route.fetch();
          const upstreamBody = await upstream.json();
          const patched = patchPostResponse(
            method,
            upstreamBody,
            postEditSwap,
            postEditPatch
          );
          return route.fulfill({
            status: upstream.status(),
            contentType: 'application/json',
            body: JSON.stringify(patched)
          });
        }
      }

      // Profile-update hot-swap. After we've captured an
      // account_update2_operation for `profileUpdateSwap.account`, patch
      // subsequent `database_api.find_accounts` responses targeting the
      // same account so `getAccountFull → posting_json_metadata` reflects
      // the broadcast values. Keeps the profile-layout header consistent
      // past the 4-second invalidation+refetch in
      // `useUpdateProfileMutation.onSuccess`.
      if (
        profileUpdateSwap &&
        profileUpdatePatch &&
        method === 'database_api.find_accounts'
      ) {
        const params = body?.params as { accounts?: unknown } | undefined;
        const requested = Array.isArray(params?.accounts) ? params?.accounts : [];
        if (requested.includes(profileUpdateSwap.account)) {
          const upstream = await route.fetch();
          const upstreamBody = await upstream.json();
          const patched = patchFindAccountsResponse(
            upstreamBody,
            profileUpdateSwap.account,
            profileUpdatePatch
          );
          return route.fulfill({
            status: upstream.status(),
            contentType: 'application/json',
            body: JSON.stringify(patched)
          });
        }
      }

      // Community-update hot-swap. After an `updateProps` broadcast for the
      // configured community has been captured, patch subsequent
      // `bridge.get_community` for that community with the edited props so the
      // 4s invalidation+refetch keeps the page on the new title/about.
      if (
        communityUpdateSwap &&
        communityUpdatePatch &&
        method === 'bridge.get_community'
      ) {
        const params = body?.params as { name?: string } | undefined;
        if (params?.name === communityUpdateSwap.community) {
          const upstream = await route.fetch();
          const upstreamBody = await upstream.json();
          const patched = patchGetCommunityResponse(
            upstreamBody,
            communityUpdateSwap.community,
            communityUpdatePatch
          );
          return route.fulfill({
            status: upstream.status(),
            contentType: 'application/json',
            body: JSON.stringify(patched)
          });
        }
      }

      // User-title hot-swap. After a setUserTitle broadcast for the account
      // has been captured, patch subsequent get_post / get_discussion so the
      // author-title badge reflects the new title (the mutation only
      // invalidates; the fixture refetch would otherwise return the old title).
      if (
        userTitleSwap &&
        userTitlePatch &&
        (method === 'bridge.get_post' || method === 'bridge.get_discussion')
      ) {
        const upstream = await route.fetch();
        const upstreamBody = await upstream.json();
        const patched = patchAuthorTitleResponse(
          method,
          upstreamBody,
          userTitlePatch.account,
          userTitlePatch.title
        );
        return route.fulfill({
          status: upstream.status(),
          contentType: 'application/json',
          body: JSON.stringify(patched)
        });
      }

      // WorkerBee block-confirmation stubs. Only kick in once we've
      // captured a broadcast — beforehand let the fixture proxy serve
      // the recorded dgpo for normal page hydration.
      if (
        confirmInBlock &&
        blockState.captured.trx &&
        WORKERBEE_POLL_METHODS.has(method)
      ) {
        if (method === 'database_api.get_dynamic_global_properties') {
          // Advance head_block_number on every poll so WorkerBee's
          // BlockCollector sees a "new" block to fetch.
          if (blockState.fakeHeadBlockNum === 0) {
            blockState.fakeHeadBlockNum = 100_000_000;
          }
          blockState.fakeHeadBlockNum++;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: rpcId ?? 1,
              result: synthDgpo(blockState.fakeHeadBlockNum)
            })
          });
        }
        if (method === 'block_api.get_block') {
          const params = body?.params as { block_num?: number } | undefined;
          const blockNum = params?.block_num ?? blockState.fakeHeadBlockNum;
          const block = synthBlockWithTrx(blockNum, blockState);
          blockState.delivered = true;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: rpcId ?? 1,
              result: { block }
            })
          });
        }
        if (method === 'block_api.get_block_range') {
          const params = body?.params as
            | { starting_block_num?: number; count?: number }
            | undefined;
          const start = params?.starting_block_num ?? blockState.fakeHeadBlockNum;
          const block = synthBlockWithTrx(start, blockState);
          blockState.delivered = true;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: rpcId ?? 1,
              result: { blocks: [block] }
            })
          });
        }
      }

      if (!(method in CANNED_RESULTS)) {
        return route.continue();
      }

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

        // Capture the trx and compute its ID for block confirmation.
        if (confirmInBlock && blockState.chain) {
          const trx = (body?.params as { trx?: Record<string, unknown> } | undefined)?.trx;
          if (trx) {
            try {
              const chain = blockState.chain as {
                createTransactionFromJson: (
                  t: unknown
                ) => { id: string; legacy_id?: string };
              };
              const apiTx = chain.createTransactionFromJson(trx);
              blockState.captured.trx = trx;
              blockState.captured.txId = apiTx.id;
              blockState.captured.legacyTxId = apiTx.legacy_id ?? null;
            } catch (err) {
              console.warn('[interceptor] failed to compute trx ID:', err);
            }
          }
        }

        // Stash the post-edit patch for later get_post / get_discussion
        // hot-swap. Only the operation that targets the configured
        // (author, permlink) seeds the patch — guards against accidental
        // capture from unrelated broadcasts in the same flow.
        if (postEditSwap) {
          const trx = (body?.params as { trx?: { operations?: unknown[] } } | undefined)?.trx;
          const op = trx?.operations?.[0] as
            | { type?: string; value?: Record<string, unknown> }
            | undefined;
          const value = op?.value as
            | { author?: string; permlink?: string; title?: string; body?: string; json_metadata?: string }
            | undefined;
          const matches =
            value?.author === postEditSwap.author &&
            value?.permlink === postEditSwap.permlink;
          if (matches && op?.type === 'comment_operation') {
            postEditPatch = {
              title: value?.title,
              body: value?.body,
              json_metadata: value?.json_metadata
            };
          } else if (matches && op?.type === 'delete_comment_operation') {
            postEditPatch = { deleted: true };
          }
        }

        // Stash the profile-update patch for later database_api.find_accounts
        // hot-swap. The wire value is already the exact JSON string the
        // chain would persist, so we can pass it through verbatim.
        if (profileUpdateSwap) {
          const trx = (body?.params as { trx?: { operations?: unknown[] } } | undefined)?.trx;
          const op = trx?.operations?.[0] as
            | { type?: string; value?: Record<string, unknown> }
            | undefined;
          const value = op?.value as
            | { account?: string; posting_json_metadata?: string }
            | undefined;
          if (
            op?.type === 'account_update2_operation' &&
            value?.account === profileUpdateSwap.account &&
            typeof value?.posting_json_metadata === 'string'
          ) {
            profileUpdatePatch = {
              posting_json_metadata: value.posting_json_metadata
            };
          }
        }

        // Stash the community-update patch from an `updateProps` community
        // custom_json. The broadcast carries the new props verbatim, so the
        // get_community hot-swap can apply them on the next fetch.
        if (communityUpdateSwap) {
          const trx = (body?.params as { trx?: { operations?: unknown[] } } | undefined)?.trx;
          const op = trx?.operations?.[0] as
            | { type?: string; value?: { id?: string; json?: string } }
            | undefined;
          if (op?.type === 'custom_json_operation' && op.value?.id === 'community') {
            try {
              const parsed = JSON.parse(op.value.json ?? '');
              if (Array.isArray(parsed) && parsed[0] === 'updateProps') {
                const payload = parsed[1] as {
                  community?: string;
                  props?: Record<string, unknown>;
                };
                if (
                  payload?.community === communityUpdateSwap.community &&
                  payload.props
                ) {
                  communityUpdatePatch = payload.props;
                }
              }
            } catch {
              /* non-JSON custom_json — ignore */
            }
          }
        }

        // Stash the new title from a setUserTitle community custom_json so the
        // get_post / get_discussion hot-swap can apply it on the refetch.
        if (userTitleSwap) {
          const trx = (body?.params as { trx?: { operations?: unknown[] } } | undefined)?.trx;
          const op = trx?.operations?.[0] as
            | { type?: string; value?: { id?: string; json?: string } }
            | undefined;
          if (op?.type === 'custom_json_operation' && op.value?.id === 'community') {
            try {
              const parsed = JSON.parse(op.value.json ?? '');
              if (Array.isArray(parsed) && parsed[0] === 'setUserTitle') {
                const payload = parsed[1] as { account?: string; title?: string };
                if (
                  payload?.account === userTitleSwap.account &&
                  typeof payload.title === 'string'
                ) {
                  userTitlePatch = { account: payload.account, title: payload.title };
                }
              }
            } catch {
              /* non-JSON custom_json — ignore */
            }
          }
        }
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
