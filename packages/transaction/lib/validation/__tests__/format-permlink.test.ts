import { describe, it } from 'mocha';
import { expect } from 'chai';
import { isValidPermlinkFormat } from '../format/permlink';

describe('isValidPermlinkFormat', () => {
  describe('valid permlinks', () => {
    it('accepts simple permlink', () => {
      expect(isValidPermlinkFormat('my-post-title')).to.equal(true);
    });

    it('accepts permlink with numbers', () => {
      expect(isValidPermlinkFormat('post-123')).to.equal(true);
    });

    it('accepts single character', () => {
      expect(isValidPermlinkFormat('a')).to.equal(true);
    });

    it('accepts numbers only', () => {
      expect(isValidPermlinkFormat('12345')).to.equal(true);
    });

    it('accepts max length permlink (255 chars)', () => {
      expect(isValidPermlinkFormat('a'.repeat(255))).to.equal(true);
    });

    it('accepts comment permlink format', () => {
      expect(isValidPermlinkFormat('re-alice-123456')).to.equal(true);
    });
  });

  describe('invalid permlinks', () => {
    it('rejects uppercase', () => {
      expect(isValidPermlinkFormat('MY-POST')).to.equal(false);
    });

    it('rejects underscores', () => {
      expect(isValidPermlinkFormat('my_post')).to.equal(false);
    });

    it('rejects dots', () => {
      expect(isValidPermlinkFormat('my.post')).to.equal(false);
    });

    it('rejects slashes', () => {
      expect(isValidPermlinkFormat('post/with/slashes')).to.equal(false);
    });

    it('rejects too long (256 chars)', () => {
      expect(isValidPermlinkFormat('a'.repeat(256))).to.equal(false);
    });

    it('rejects empty string', () => {
      expect(isValidPermlinkFormat('')).to.equal(false);
    });

    it('rejects non-string input', () => {
      expect(isValidPermlinkFormat(null as any)).to.equal(false);
      expect(isValidPermlinkFormat(undefined as any)).to.equal(false);
    });
  });
});
