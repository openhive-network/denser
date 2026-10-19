import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidLiteName } from '@hiveio/lite-account';

const { authorDisplayName, isLiteDid, liteNameOf, postAuthorFromParam, postAuthorKind } = await import(
  './lite-did.ts'
);

describe('isLiteDid / liteNameOf', () => {
  it('accepts a DID whose name follows the lite name grammar', () => {
    assert.equal(isLiteDid('did:lite:lite-smoke-1016'), true);
    assert.equal(liteNameOf('did:lite:lite-smoke-1016'), 'lite-smoke-1016');
  });

  it('rejects account names, other DID methods and malformed lite names', () => {
    for (const author of ['alice', 'did:key:z6Mk', 'did:lite:', 'did:lite:Bob', 'did:lite:ab', 'did:lite:bob-', 'lite:bob']) {
      assert.equal(isLiteDid(author), false, author);
      assert.equal(liteNameOf(author), undefined, author);
    }
    assert.equal(isLiteDid(undefined), false);
  });

  it('applies the same name grammar as @hiveio/lite-account', () => {
    const names = ['bob', 'ab', 'lite-smoke-1016', 'a-b', 'bob-', '1bob', 'Bob', 'bob.alice', 'bob.al', 'abcdefghijklmnop', 'abcdefghijklmnopq', 'bo_b'];
    for (const name of names) assert.equal(isLiteDid(`did:lite:${name}`), isValidLiteName(name), name);
  });

  it('shows the bare lite name of a DID and an account name as it is', () => {
    assert.equal(authorDisplayName('did:lite:bob-the-guest'), 'bob-the-guest');
    assert.equal(authorDisplayName('alice'), 'alice');
  });
});

describe('post route authors', () => {
  it('reads the author of plain and percent-encoded @ segments', () => {
    assert.equal(postAuthorFromParam('@alice'), 'alice');
    assert.equal(postAuthorFromParam('%40alice'), 'alice');
    assert.equal(postAuthorFromParam('@did:lite:lite-smoke-1016'), 'did:lite:lite-smoke-1016');
    assert.equal(postAuthorFromParam('%40did%3Alite%3Alite-smoke-1016'), 'did:lite:lite-smoke-1016');
  });

  it('refuses segments without @ and malformed encodings', () => {
    assert.equal(postAuthorFromParam('alice'), null);
    assert.equal(postAuthorFromParam('did:lite:bob'), null);
    assert.equal(postAuthorFromParam('%40al%E0%A4ice'), null);
    assert.equal(postAuthorFromParam(undefined), null);
  });

  it('accepts @did:lite:<name>, leaves account names to the account check and rejects other did: forms', () => {
    assert.equal(postAuthorKind('did:lite:lite-smoke-1016'), 'lite');
    assert.equal(postAuthorKind('alice'), 'account');
    assert.equal(postAuthorKind('did:key:z6Mk'), 'invalid');
    assert.equal(postAuthorKind('did:lite:NotAName'), 'invalid');
  });
});
