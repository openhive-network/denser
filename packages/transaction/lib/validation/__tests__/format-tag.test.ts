import { describe, it } from 'mocha';
import { expect } from 'chai';
import { isValidTagFormat } from '../format/tag';

describe('isValidTagFormat', () => {
  describe('valid tags', () => {
    it('accepts simple lowercase tag', () => {
      expect(isValidTagFormat('hive')).to.equal(true);
    });

    it('accepts tag with numbers', () => {
      expect(isValidTagFormat('hive123')).to.equal(true);
    });

    it('accepts tag with hyphen', () => {
      expect(isValidTagFormat('hive-blog')).to.equal(true);
    });

    it('accepts tag with underscore (hivemind allows)', () => {
      expect(isValidTagFormat('open_source')).to.equal(true);
    });

    it('accepts single letter', () => {
      expect(isValidTagFormat('a')).to.equal(true);
    });

    it('accepts single digit', () => {
      expect(isValidTagFormat('1')).to.equal(true);
    });

    it('accepts tag with multiple hyphens', () => {
      expect(isValidTagFormat('a-b-c')).to.equal(true);
    });

    it('accepts tag with consecutive hyphens', () => {
      expect(isValidTagFormat('a--b')).to.equal(true);
    });

    it('accepts longer tags (hivemind has no 24-char limit)', () => {
      expect(isValidTagFormat('abcdefghijklmnopqrstuvwxyz12')).to.equal(true);
    });
  });

  describe('invalid tags', () => {
    it('rejects uppercase', () => {
      expect(isValidTagFormat('HIVE')).to.equal(false);
    });

    it('rejects mixed case', () => {
      expect(isValidTagFormat('Hive')).to.equal(false);
    });

    it('rejects special characters', () => {
      expect(isValidTagFormat('hive!')).to.equal(false);
    });

    it('rejects spaces', () => {
      expect(isValidTagFormat('hive blog')).to.equal(false);
    });

    it('rejects dots', () => {
      expect(isValidTagFormat('hive.blog')).to.equal(false);
    });

    it('rejects too long tag (257 chars)', () => {
      expect(isValidTagFormat('a'.repeat(257))).to.equal(false);
    });

    it('rejects empty string', () => {
      expect(isValidTagFormat('')).to.equal(false);
    });

    it('rejects non-string input', () => {
      expect(isValidTagFormat(null as any)).to.equal(false);
      expect(isValidTagFormat(undefined as any)).to.equal(false);
      expect(isValidTagFormat(123 as any)).to.equal(false);
    });
  });
});
