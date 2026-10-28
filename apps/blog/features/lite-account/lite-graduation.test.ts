import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLiteIdentity,
  l2Digest,
  LiteRelayError,
  recoverPublicKey,
  type L2Transaction,
  type LiteGraduateRequest
} from '@hiveio/lite-account';

const { graduateLiteAccount, GRADUATION_ROLES, LiteGraduationError, retryLiteLink } = await import(
  './lite-graduation.ts'
);
const { storedFromCreated } = await import('./lite-identity-record.ts');

const NAME = 'brave-otter-482';
const ACCOUNT = 'brave-otter';
const RELAY = { chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000', accountApp: 'lite_account_test' };
const identity = { ...storedFromCreated(createLiteIdentity(NAME)), registered: true };
const KEYS = {
  owner: 'STM6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4',
  active: 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ghm2D6b2gUMUddLUMBDx7ZZ',
  posting: 'STM7SzVBFaUpKFCgTruZig4UVdRGzurFLvnudxkQbhX1eFtoTEoDc',
  memo: 'STM67vr8aQPGrnXbeKNcMFSbLJBXWpTNbKJGhDEL7xRA1tRsKBtvV'
};
const signerKeys = (roles: (keyof typeof KEYS)[] = ['owner', 'active', 'posting', 'memo']) =>
  roles.map((role) => ({ role: GRADUATION_ROLES[role], publicKey: KEYS[role] }));

/**
 * A gateway answering `/graduate` with `answer` (or refusing with `refuse`), recording what it was
 * sent; its graduation read names the account linked from the `linkedAfter`-th read on.
 */
function fakeGateway({
  answer = { link_trx_id: 'b'.repeat(40) as string | null },
  refuse,
  linkedAfter = 1
}: { answer?: { link_trx_id: string | null }; refuse?: string; linkedAfter?: number } = {}) {
  const graduated: LiteGraduateRequest[] = [];
  const relayed: L2Transaction[] = [];
  let reads = 0;
  const gateway = {
    graduate: async (request: LiteGraduateRequest) => {
      graduated.push(request);
      if (refuse) throw new LiteRelayError(refuse as LiteRelayError['code'], refuse);
      const account = String(request.tx.operations[0].args.account);
      return { ok: true as const, account, create_trx_id: 'a'.repeat(40), path: 'claimed' as const, ...answer };
    },
    relayLink: async (tx: L2Transaction) => {
      relayed.push(tx);
      return { ok: true, trx_id: 'c'.repeat(40) };
    },
    linkedAccount: async () => (++reads >= linkedAfter ? ACCOUNT : null)
  };
  return { gateway, graduated, relayed, reads: () => reads };
}

const noWait = async () => undefined;

function run(gateway: ReturnType<typeof fakeGateway>['gateway'], readKeys = async () => signerKeys()) {
  const steps: string[] = [];
  const created: string[] = [];
  const outcome = graduateLiteAccount({
    identity,
    account: ACCOUNT,
    readKeys,
    relay: RELAY,
    onStep: (step) => steps.push(step),
    onCreated: (account) => created.push(account),
    gateway,
    wait: noWait
  });
  return { outcome, steps, created };
}

/** The lite account's posting key signed `tx`, over its L2 digest on the relay's chain. */
function assertSignedByPostingKey(tx: L2Transaction) {
  const { signatures, ...fields } = tx;
  assert.equal(signatures.length, 1);
  assert.equal(recoverPublicKey(l2Digest(fields, RELAY.chainId), signatures[0]), identity.postingPublicKey);
}

describe('graduateLiteAccount', () => {
  it('sends the signer\'s four keys and a posting-signed link, then waits for the link to show', async () => {
    const fake = fakeGateway({ linkedAfter: 2 });
    const { outcome, steps, created } = run(fake.gateway);
    assert.deepEqual(await outcome, { account: ACCOUNT, keys: KEYS, linked: true });
    assert.deepEqual(steps, ['keys', 'creating', 'linking']);
    assert.deepEqual(created, [ACCOUNT]);
    assert.equal(fake.graduated.length, 1);
    const { tx, keys } = fake.graduated[0];
    assert.deepEqual(keys, KEYS);
    assert.equal(tx.app, RELAY.accountApp);
    assert.deepEqual(tx.operations, [{ method: 'link', args: { name: NAME, account: ACCOUNT } }]);
    assertSignedByPostingKey(tx);
    assert.equal(fake.reads(), 2);
    assert.deepEqual(fake.relayed, []);
  });

  it('ends unlinked, without reading, when the gateway created the account but its link failed', async () => {
    const fake = fakeGateway({ answer: { link_trx_id: null } });
    const { outcome, created } = run(fake.gateway);
    assert.deepEqual(await outcome, { account: ACCOUNT, keys: KEYS, linked: false });
    assert.deepEqual(created, [ACCOUNT]);
    assert.equal(fake.reads(), 0);
  });

  it('ends unlinked when the link never shows up', async () => {
    const fake = fakeGateway({ linkedAfter: Infinity });
    assert.equal((await run(fake.gateway).outcome).linked, false);
  });

  for (const code of ['name_taken', 'daily_cap', 'graduation_disabled', 'creator_balance', 'not_eligible']) {
    it(`rejects with the gateway's ${code}, and nothing is recorded as created`, async () => {
      const fake = fakeGateway({ refuse: code });
      const { outcome, steps, created } = run(fake.gateway);
      await assert.rejects(outcome, (error: unknown) => error instanceof LiteRelayError && error.code === code);
      assert.deepEqual(steps, ['keys', 'creating']);
      assert.deepEqual(created, []);
    });
  }

  it('rejects before asking the gateway when the signer leaves a role out', async () => {
    const fake = fakeGateway();
    const { outcome } = run(fake.gateway, async () => signerKeys(['owner', 'active', 'posting']));
    await assert.rejects(outcome, (error: unknown) => error instanceof LiteGraduationError && error.code === 'signer_keys');
    assert.deepEqual(fake.graduated, []);
  });

  it('rejects with the signer\'s failure before asking the gateway', async () => {
    const fake = fakeGateway();
    const cancelled = Object.assign(new Error('closed'), { code: 'cancelled' });
    await assert.rejects(run(fake.gateway, () => Promise.reject(cancelled)).outcome, cancelled);
    assert.deepEqual(fake.graduated, []);
  });
});

describe('retryLiteLink', () => {
  it('relays a freshly signed link through /l2 and waits for it to show', async () => {
    const fake = fakeGateway({ linkedAfter: 1 });
    assert.equal(await retryLiteLink({ identity, account: ACCOUNT, relay: RELAY, gateway: fake.gateway, wait: noWait }), true);
    assert.equal(fake.relayed.length, 1);
    assert.deepEqual(fake.relayed[0].operations, [{ method: 'link', args: { name: NAME, account: ACCOUNT } }]);
    assertSignedByPostingKey(fake.relayed[0]);
    assert.deepEqual(fake.graduated, []);
  });

  it('resolves false when the relayed link does not show up', async () => {
    const fake = fakeGateway({ linkedAfter: Infinity });
    assert.equal(await retryLiteLink({ identity, account: ACCOUNT, relay: RELAY, gateway: fake.gateway, wait: noWait }), false);
  });
});
