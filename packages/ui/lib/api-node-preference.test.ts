import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  DEFAULT_HIVE_API_NODES,
  getAllowedHiveApiNodes,
  isAllowedHiveApiNode,
  normalizeApiNodeUrl,
  readPreferredApiNodeFromCookie
} from './api-node-preference';

describe('api-node-preference', () => {
  describe('normalizeApiNodeUrl', () => {
    it('strips trailing slashes and whitespace', () => {
      expect(normalizeApiNodeUrl(' https://api.hive.blog/ ')).to.equal('https://api.hive.blog');
    });
  });

  describe('isAllowedHiveApiNode', () => {
    it('accepts default healthchecker providers', () => {
      for (const node of DEFAULT_HIVE_API_NODES) {
        expect(isAllowedHiveApiNode(node), node).to.equal(true);
      }
    });

    it('rejects arbitrary hosts (SSRF guard)', () => {
      expect(isAllowedHiveApiNode('https://evil.example/steal')).to.equal(false);
      expect(isAllowedHiveApiNode('http://127.0.0.1:59999')).to.equal(false);
      expect(isAllowedHiveApiNode('not-a-url')).to.equal(false);
    });

    it('rejects javascript: URLs', () => {
      expect(isAllowedHiveApiNode('javascript:alert(1)')).to.equal(false);
    });
  });

  describe('getAllowedHiveApiNodes', () => {
    it('includes at least the default provider list when env is unset', () => {
      const allowed = getAllowedHiveApiNodes();
      for (const node of DEFAULT_HIVE_API_NODES) {
        expect(allowed).to.include(normalizeApiNodeUrl(node));
      }
    });
  });

  describe('readPreferredApiNodeFromCookie', () => {
    it('returns allowlisted decoded cookie values', () => {
      const node = 'https://api.openhive.network';
      const value = encodeURIComponent(node);
      expect(readPreferredApiNodeFromCookie((name) => (name === 'api-node' ? value : undefined))).to.equal(
        node
      );
    });

    it('ignores non-allowlisted cookie values', () => {
      const value = encodeURIComponent('https://evil.example');
      expect(readPreferredApiNodeFromCookie(() => value)).to.equal(undefined);
    });
  });
});
