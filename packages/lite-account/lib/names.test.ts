import { describe, it } from 'mocha';
import { expect } from 'chai';
import { generateLiteName, isValidLiteName, liteDid } from './names';
import { isValidPermlink, mintReplyPermlink } from './permlink';

describe('lite names and permlinks', () => {
  it('generates names valid under the app grammar', () => {
    for (let i = 0; i < 200; i++) expect(isValidLiteName(generateLiteName())).to.equal(true);
  });
  it('enforces the grammar', () => {
    expect(isValidLiteName('ab')).to.equal(false);
    expect(isValidLiteName('-abc')).to.equal(false);
    expect(isValidLiteName('abc-')).to.equal(false);
    expect(isValidLiteName('Abc')).to.equal(false);
    expect(isValidLiteName('a'.repeat(64))).to.equal(false);
    expect(isValidLiteName('brave-otter-4823')).to.equal(true);
    expect(liteDid('x-y')).to.equal('did:lite:x-y');
  });
  it('mints valid, prefixed, unique reply permlinks', () => {
    const a = mintReplyPermlink('Alice.Smith', 'Hello World!', 'abcdef0123');
    const b = mintReplyPermlink('Alice.Smith', 'Hello World!', 'abcdef0123');
    expect(isValidPermlink(a)).to.equal(true);
    expect(a.startsWith('re-alice-smith-hello-world-abcdef')).to.equal(true);
    expect(a).to.not.equal(b);
  });
});
