import { describe, it } from 'mocha';
import { expect } from 'chai';
import { l2Digest, MAINNET_CHAIN_ID } from './digest';
import { generateKeyPair } from './keys';
import {
  attestPostOp, l2Expiration, l2SignedFields, liteBridgeMarker, LITE_ACCOUNT_APP, LITE_POSTS_APP,
  registerAccountOp, signL2Transaction, singleKeyAuthority, unsignedL2Transaction
} from './ops';
import { recoverPublicKey } from './sign';
import vectors from './__fixtures__/jcs-vectors.json';

const OWNER = 'STM6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4';
const POSTING = 'STM7j1orEPpWp4bU2SuH46eYXuXkFKEMeJkuXkZVJSaru2zFDGaEH';

function vector(name: string): string {
  const v = vectors.find((x) => x.name === name);
  if (!v) throw new Error(`missing vector ${name}`);
  return v.digest_mainnet;
}

describe('L2 operation builders', () => {
  it('builds register_account exactly as the reference vector', () => {
    const fields = l2SignedFields(LITE_ACCOUNT_APP,
      [registerAccountOp('brave-otter-4823', singleKeyAuthority(OWNER), singleKeyAuthority(POSTING))],
      '2026-09-30T12:00:00');
    expect(l2Digest(fields, MAINNET_CHAIN_ID)).to.equal(vector('register_account'));
    expect(unsignedL2Transaction(fields).signatures).to.deep.equal([]);
  });
  it('builds attest_post exactly as the reference vector', () => {
    const fields = l2SignedFields(LITE_POSTS_APP,
      [attestPostOp({ author: 'brave-otter-4823', l1Author: 'gate1', permlink: 're-alice-abc-k3f9qz', contentHash: '00'.repeat(32) })],
      '2026-09-30T12:00:00');
    expect(l2Digest(fields, MAINNET_CHAIN_ID)).to.equal(vector('attest_post'));
  });
  it('signs a transaction so the signature recovers to the posting key', () => {
    const key = generateKeyPair();
    const fields = l2SignedFields(LITE_POSTS_APP, [attestPostOp({ author: 'x', l1Author: 'g', permlink: 'p', contentHash: '11'.repeat(32) })], l2Expiration(5), 'n1');
    const tx = signL2Transaction(fields, MAINNET_CHAIN_ID, [key.wif]);
    expect(tx.nonce).to.equal('n1');
    expect(tx.signatures).to.have.length(1);
    expect(recoverPublicKey(l2Digest(fields, MAINNET_CHAIN_ID), tx.signatures[0] ?? '')).to.equal(key.publicKey);
  });
  it('formats expiration as ISO seconds without zone, and the bridge marker', () => {
    expect(l2Expiration(10, Date.UTC(2026, 8, 30, 12, 0, 0))).to.equal('2026-09-30T12:10:00');
    expect(liteBridgeMarker('brave-otter-4823')).to.deep.equal({ attester: 'brave-otter-4823', alg: 'lite-comment-v1' });
  });
});
