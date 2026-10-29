import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWaxFoundation } from '@hiveio/wax';
import { MemoLayoutError, parseEncryptedMemo, toSnapMemoLayout, toStandardMemoLayout } from './memo-layout.ts';

const wax = await createWaxFoundation();
const toPublicKeyString = (key: Uint8Array) => wax.convertRawPublicKeyToWif(Buffer.from(key).toString('hex'));

/** The from/to keys wax reads off a memo (it parses both layouts). */
const readMemoKeysWithWax = async (memo: string) => {
  let keys: [string, string] | undefined;
  const notCalled = async () => {
    throw new Error('not called by decrypt');
  };
  const keyCapturingWallet = {
    signDigest: notCalled,
    encryptData: notCalled,
    decryptData: async (_content: string, from: string, to?: string) => {
      keys = [from, to ?? from];
      return '';
    }
  };
  await wax.decrypt(keyCapturingWallet, memo);
  return keys;
};

const TEAMVN_MEMO_KEY = 'STM7PHiVv5EDPbGo8rc9PFsUhHqg5x7LB6PjpBhgkdqfnWRrLLDPs';
const QUOCHUY_MEMO_KEY = 'STM62zRP1wB3gkWjGm1Wg4C3eLa9UGYPiMhSQycRAySAUtdyTmRda';

/** Sent by teamvn to quochuy from Peakd: the standard layout. */
const PEAKD_MEMO =
  '#96yFR73bPWYcfCKyFBD8EPaZRVxCB3a9KWM1Rbh9sgZHp7W9gKsgY7FbSthzX8nvwYkr3Ri7RNTHV8iAHQdYE5goQVHDN72BQZA3F9f1iGQHnsYV837sJaVg6bnjdJQcLGwzWBKDjpHHyau61szDD9B';
/** Sent by quochuy to teamvn through the MetaMask snap, as the snap returned it. */
const SNAP_MEMO =
  '#g9iZFyvzKeiJSLTaUS8V5DGR9FKpDESZzGVuWZHgNUksgDavK39n5qFBtH4DRqAAPy5sR3QZiB8X3jDantheasRkocfw2UE3T8hbWDFTS9kfttiuvxokgucQANm6BNvU41KBF96WyZ3pfpPTwxSX4hH';

const ENCRYPTED_MEMO = /^#[1-9A-HJ-NP-Za-km-z]+$/;

describe('memo-layout: parseEncryptedMemo', () => {
  it('reads the from/to memo keys of a standard memo (Peakd)', () => {
    const { from, to, body } = parseEncryptedMemo(PEAKD_MEMO);

    assert.equal(toPublicKeyString(from), TEAMVN_MEMO_KEY);
    assert.equal(toPublicKeyString(to), QUOCHUY_MEMO_KEY);
    // nonce | check | varint 32 | 32 bytes of ciphertext
    assert.equal(body.length, 45);
    assert.equal(body[12], 32);
  });

  it('reads the from/to memo keys of a memo in the snap layout', () => {
    const { from, to, body } = parseEncryptedMemo(SNAP_MEMO);

    assert.equal(toPublicKeyString(from), QUOCHUY_MEMO_KEY);
    assert.equal(toPublicKeyString(to), TEAMVN_MEMO_KEY);
    assert.equal(body.length, 45);
  });

  it('reads a memo without its leading #', () => {
    assert.deepEqual(parseEncryptedMemo(PEAKD_MEMO.slice(1)), parseEncryptedMemo(PEAKD_MEMO));
  });

  it('rejects text that is not base58', () => {
    assert.throws(() => parseEncryptedMemo('#hello world'), MemoLayoutError);
  });

  it('rejects base58 that is neither layout', () => {
    assert.throws(() => parseEncryptedMemo('#' + PEAKD_MEMO.slice(1, 60)), MemoLayoutError);
    assert.throws(() => parseEncryptedMemo('#'), MemoLayoutError);
  });
});

describe('memo-layout: converting between layouts', () => {
  it('rewrites a snap memo as a standard memo that wax reads from the same keys', async () => {
    const standard = toStandardMemoLayout(SNAP_MEMO);

    assert.match(standard, ENCRYPTED_MEMO);
    assert.notEqual(standard, SNAP_MEMO);
    assert.deepEqual(parseEncryptedMemo(standard), parseEncryptedMemo(SNAP_MEMO));
    assert.deepEqual(await readMemoKeysWithWax(standard), [QUOCHUY_MEMO_KEY, TEAMVN_MEMO_KEY]);
    assert.deepEqual(await readMemoKeysWithWax(SNAP_MEMO), [QUOCHUY_MEMO_KEY, TEAMVN_MEMO_KEY]);
  });

  it('leaves a memo already in the target layout as it is, with a single #', () => {
    assert.equal(toStandardMemoLayout(PEAKD_MEMO), PEAKD_MEMO);
    assert.equal(toStandardMemoLayout(PEAKD_MEMO.slice(1)), PEAKD_MEMO);
    assert.equal(toSnapMemoLayout(SNAP_MEMO), SNAP_MEMO);
  });

  it('round-trips between the layouts', () => {
    assert.equal(toSnapMemoLayout(toStandardMemoLayout(SNAP_MEMO)), SNAP_MEMO);
    assert.equal(toStandardMemoLayout(toSnapMemoLayout(PEAKD_MEMO)), PEAKD_MEMO);
  });
});
