import { describe, it } from 'mocha';
import { expect } from 'chai';
import { isCommunityFormat } from '../format/community';

describe('isCommunityFormat', () => {
  describe('valid community names', () => {
    it('accepts 6-digit community starting with 1', () => {
      expect(isCommunityFormat('hive-140217')).to.equal(true);
    });

    it('accepts 5-digit community starting with 1', () => {
      expect(isCommunityFormat('hive-12345')).to.equal(true);
    });

    it('accepts 7-digit community starting with 1', () => {
      expect(isCommunityFormat('hive-1234567')).to.equal(true);
    });

    it('accepts community starting with 2', () => {
      expect(isCommunityFormat('hive-200000')).to.equal(true);
    });

    it('accepts community starting with 3', () => {
      expect(isCommunityFormat('hive-300000')).to.equal(true);
    });

    it('accepts minimum valid (5 digits)', () => {
      expect(isCommunityFormat('hive-10000')).to.equal(true);
    });

    it('accepts maximum valid (7 digits)', () => {
      expect(isCommunityFormat('hive-3999999')).to.equal(true);
    });
  });

  describe('invalid community names', () => {
    it('rejects first digit 0', () => {
      expect(isCommunityFormat('hive-012345')).to.equal(false);
    });

    it('rejects first digit 4', () => {
      expect(isCommunityFormat('hive-400000')).to.equal(false);
    });

    it('rejects first digit 9', () => {
      expect(isCommunityFormat('hive-999999')).to.equal(false);
    });

    it('rejects too few digits (4)', () => {
      expect(isCommunityFormat('hive-1234')).to.equal(false);
    });

    it('rejects too many digits (8)', () => {
      expect(isCommunityFormat('hive-12345678')).to.equal(false);
    });

    it('rejects letters after hive-', () => {
      expect(isCommunityFormat('hive-abcdef')).to.equal(false);
    });

    it('rejects missing hive- prefix', () => {
      expect(isCommunityFormat('community-123456')).to.equal(false);
    });

    it('rejects plain tag', () => {
      expect(isCommunityFormat('trending')).to.equal(false);
    });

    it('rejects null/undefined', () => {
      expect(isCommunityFormat(null)).to.equal(false);
      expect(isCommunityFormat(undefined)).to.equal(false);
    });

    it('rejects empty string', () => {
      expect(isCommunityFormat('')).to.equal(false);
    });
  });
});
