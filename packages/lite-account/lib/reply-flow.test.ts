import { describe, it } from 'mocha';
import { expect } from 'chai';
import { MAINNET_CHAIN_ID } from './digest';
import { LiteRelayValidationError, validateLiteReply } from './relay-validate';
import { buildLiteReplyRequest, createLiteIdentity } from './reply-flow';

const OPTS = { gateAccount: 'gate1', chainId: MAINNET_CHAIN_ID, maxExpirationMinutes: 60, maxBodyBytes: 65536, nowMs: Date.UTC(2026, 8, 30, 12, 0, 0) };
const COMMENT = { parent_author: 'alice', parent_permlink: 'hello-world', title: '', body: 'Nice post! 🚀', tags: [] };

function build(registered: boolean) {
  const identity = { ...createLiteIdentity('brave-otter-4823', OPTS.nowMs), registered };
  return { identity, ...buildLiteReplyRequest({ identity, gateAccount: 'gate1', chainId: MAINNET_CHAIN_ID, comment: COMMENT, nowMs: OPTS.nowMs, clientId: 'c1' }) };
}

describe('lite reply flow: build → relay validation round-trip', () => {
  it('first post: register + attest, validated, signer = posting key', () => {
    const { identity, request, permlink, contentHash } = build(false);
    expect(request.register_tx?.operations[0]?.method).to.equal('register_account');
    expect(request.register_tx?.signatures).to.deep.equal([]);
    expect(request.attest_tx.operations[0]?.args.content_hash).to.equal(contentHash);
    expect(request.attest_tx.operations[0]?.args.permlink).to.equal(permlink);
    const v = validateLiteReply(request, OPTS);
    expect(v.permlink).to.equal(permlink);
    expect(v.signer).to.equal(identity.postingPublicKey);
    expect(v.signer).to.not.equal(identity.ownerPublicKey);
  });
  it('subsequent post: attest only', () => {
    const { request } = build(true);
    expect(request.register_tx).to.equal(undefined);
    expect(validateLiteReply(request, OPTS).permlink).to.equal(request.attest_tx.operations[0]?.args.permlink);
  });
  it('rejects tampered content, wrong gate, foreign signer, and stale expiration', () => {
    const { request } = build(false);
    const tampered = { ...request, comment: { ...COMMENT, body: 'Edited by the relay' } };
    expect(() => validateLiteReply(tampered, OPTS)).to.throw(LiteRelayValidationError).with.property('code', 'content_mismatch');
    expect(() => validateLiteReply(request, { ...OPTS, gateAccount: 'other' })).to.throw(LiteRelayValidationError).with.property('code', 'invalid_request');
    const other = createLiteIdentity('brave-otter-4823', OPTS.nowMs);
    const foreign = buildLiteReplyRequest({ identity: { ...other, registered: false }, gateAccount: 'gate1', chainId: MAINNET_CHAIN_ID, comment: COMMENT, nowMs: OPTS.nowMs });
    const swapped = { ...request, attest_tx: foreign.request.attest_tx };
    expect(() => validateLiteReply(swapped, OPTS)).to.throw(LiteRelayValidationError).with.property('code', 'bad_signature');
    expect(() => validateLiteReply(request, { ...OPTS, nowMs: OPTS.nowMs + 3_600_000 })).to.throw(/expired/);
  });
});
