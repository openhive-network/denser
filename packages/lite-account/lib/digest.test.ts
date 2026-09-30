import { describe, it } from 'mocha';
import { expect } from 'chai';
import { contentHash, l2Digest, MAINNET_CHAIN_ID } from './digest';
import vectors from './__fixtures__/jcs-vectors.json';

const TESTNET_CHAIN_ID = '18dcf0a285365fc58b71f18b3d3fec954aa0c141c44e4e5cb4cf777b9eab274e';

describe('l2Digest = sha256(chain_id || JCS)', () => {
  for (const v of vectors) {
    it(`matches the Python reference on mainnet + testnet ids: ${v.name}`, () => {
      expect(l2Digest(v.input, MAINNET_CHAIN_ID)).to.equal(v.digest_mainnet);
      expect(l2Digest(v.input, TESTNET_CHAIN_ID)).to.equal(v.digest_testnet);
    });
  }
  it('rejects a chain id that is not 64 hex chars', () => {
    expect(() => l2Digest({}, '42')).to.throw(/64-character hex/);
  });
  it('contentHash covers exactly {parent_author, parent_permlink, title, body, tags}', () => {
    const v = vectors.find((x) => x.name === 'content');
    if (!v || typeof v.input !== 'object' || v.input === null || Array.isArray(v.input)) throw new Error('missing content vector');
    const c = v.input;
    if (!('body' in c) || !('tags' in c)) throw new Error('bad vector');
    const content = {
      parent_author: String(c.parent_author),
      parent_permlink: String(c.parent_permlink),
      title: String(c.title),
      body: String(c.body),
      tags: Array.isArray(c.tags) ? c.tags.map(String) : []
    };
    expect(contentHash(content, MAINNET_CHAIN_ID)).to.equal(v.digest_mainnet);
  });
});
