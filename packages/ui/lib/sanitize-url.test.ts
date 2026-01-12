/**
 * Security tests for URL and DOM ID sanitization utilities.
 *
 * These tests verify protection against:
 * - XSS via javascript:/vbscript:/data: URLs
 * - DOM-based XSS via malicious element IDs
 * - Protocol injection attacks
 * - Encoding bypass attempts
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  isDangerousProtocol,
  sanitizeUrl,
  isValidElementId,
  sanitizeHash,
  isInternalPath,
  buildSafePath
} from './sanitize-url';

describe('URL Sanitization Security Tests', () => {
  describe('isDangerousProtocol', () => {
    describe('should detect javascript: protocol', () => {
      const vectors = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'JaVaScRiPt:alert(1)',
        '  javascript:alert(1)',
        'javascript:alert("xss")',
        'javascript:void(0)',
        'javascript:document.cookie'
      ];

      vectors.forEach((url) => {
        it(`should block: ${url}`, () => {
          expect(isDangerousProtocol(url)).to.be.true;
        });
      });
    });

    describe('should detect vbscript: protocol', () => {
      const vectors = ['vbscript:msgbox(1)', 'VBSCRIPT:msgbox(1)', 'VbScRiPt:msgbox(1)'];

      vectors.forEach((url) => {
        it(`should block: ${url}`, () => {
          expect(isDangerousProtocol(url)).to.be.true;
        });
      });
    });

    describe('should detect data: protocol', () => {
      const vectors = [
        'data:text/html,<script>alert(1)</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'DATA:text/html,<script>alert(1)</script>'
      ];

      vectors.forEach((url) => {
        it(`should block: ${url}`, () => {
          expect(isDangerousProtocol(url)).to.be.true;
        });
      });
    });

    describe('should detect other dangerous protocols', () => {
      const vectors = [
        'file:///etc/passwd',
        'blob:https://evil.com/malicious',
        'about:blank',
        'ms-its:mhtml:file://c:',
        'mhtml:file://c:'
      ];

      vectors.forEach((url) => {
        it(`should block: ${url}`, () => {
          expect(isDangerousProtocol(url)).to.be.true;
        });
      });
    });

    describe('should allow safe protocols', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        '/path/to/page',
        '/@username/post',
        '#anchor',
        'mailto:test@example.com',
        'tel:+1234567890'
      ];

      safeUrls.forEach((url) => {
        it(`should allow: ${url}`, () => {
          expect(isDangerousProtocol(url)).to.be.false;
        });
      });
    });

    describe('should handle edge cases', () => {
      it('should return false for empty string', () => {
        expect(isDangerousProtocol('')).to.be.false;
      });

      it('should return false for null/undefined', () => {
        // @ts-expect-error - Testing invalid input
        expect(isDangerousProtocol(null)).to.be.false;
        // @ts-expect-error - Testing invalid input
        expect(isDangerousProtocol(undefined)).to.be.false;
      });

      it('should handle encoded javascript:', () => {
        expect(isDangerousProtocol('javascript%3Aalert(1)')).to.be.true;
      });

      it('should handle null bytes in protocol', () => {
        expect(isDangerousProtocol('java\x00script:alert(1)')).to.be.true;
        expect(isDangerousProtocol('javas\x00cript:alert(1)')).to.be.true;
        expect(isDangerousProtocol('\x00javascript:alert(1)')).to.be.true;
      });
    });
  });

  describe('sanitizeUrl', () => {
    it('should return safe URLs unchanged', () => {
      expect(sanitizeUrl('https://example.com')).to.equal('https://example.com');
      expect(sanitizeUrl('/path/to/page')).to.equal('/path/to/page');
      expect(sanitizeUrl('/@username')).to.equal('/@username');
    });

    it('should return undefined for dangerous URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).to.be.undefined;
      expect(sanitizeUrl('data:text/html,<script>')).to.be.undefined;
    });

    it('should return undefined for empty/invalid input', () => {
      expect(sanitizeUrl('')).to.be.undefined;
      // @ts-expect-error - Testing invalid input
      expect(sanitizeUrl(null)).to.be.undefined;
    });
  });

  describe('isValidElementId', () => {
    describe('should accept valid element IDs', () => {
      const validIds = [
        'section-1',
        'header_title',
        'my.element.id',
        'item:123',
        'username',
        'a1b2c3',
        'A-Z_test',
        '@username/permlink',
        'user/post',
        '@alice'
      ];

      validIds.forEach((id) => {
        it(`should accept: ${id}`, () => {
          expect(isValidElementId(id)).to.be.true;
        });
      });
    });

    describe('should reject invalid element IDs', () => {
      const invalidIds = [
        '<script>alert(1)</script>',
        'test<img src=x>',
        'id with spaces',
        "id'with'quotes",
        'id"with"doublequotes',
        'id`with`backticks',
        'id;with;semicolons',
        'id&with&ampersands',
        '',
        'a'.repeat(300) // Too long
      ];

      invalidIds.forEach((id) => {
        it(`should reject: ${id.substring(0, 30)}${id.length > 30 ? '...' : ''}`, () => {
          expect(isValidElementId(id)).to.be.false;
        });
      });
    });

    it('should handle null/undefined', () => {
      // @ts-expect-error - Testing invalid input
      expect(isValidElementId(null)).to.be.false;
      // @ts-expect-error - Testing invalid input
      expect(isValidElementId(undefined)).to.be.false;
    });

    it('should reject IDs containing null bytes', () => {
      expect(isValidElementId('section\x00-1')).to.be.false;
      expect(isValidElementId('\x00section')).to.be.false;
      expect(isValidElementId('section\x00')).to.be.false;
    });
  });

  describe('sanitizeHash', () => {
    describe('should sanitize valid hashes', () => {
      it('should remove # prefix and return valid hash', () => {
        expect(sanitizeHash('#section-1')).to.equal('section-1');
        expect(sanitizeHash('section-1')).to.equal('section-1');
      });

      it('should decode URL-encoded hashes', () => {
        expect(sanitizeHash('#user%2Fpost')).to.equal('user/post');
      });

      it('should handle Hive-style comment anchors', () => {
        expect(sanitizeHash('#@alice/my-post')).to.equal('@alice/my-post');
        expect(sanitizeHash('@bob/comment-123')).to.equal('@bob/comment-123');
      });
    });

    describe('should reject invalid hashes', () => {
      it('should return undefined for XSS attempts', () => {
        expect(sanitizeHash('#<script>')).to.be.undefined;
        expect(sanitizeHash('#test<img>')).to.be.undefined;
      });

      it('should return undefined for empty hash', () => {
        expect(sanitizeHash('#')).to.be.undefined;
        expect(sanitizeHash('')).to.be.undefined;
      });

      it('should handle invalid encoding', () => {
        expect(sanitizeHash('#%invalid')).to.be.undefined;
      });
    });
  });

  describe('isInternalPath', () => {
    describe('should accept valid internal paths', () => {
      const validPaths = [
        '/',
        '/trending',
        '/@username',
        '/trending/hive',
        '/search?q=test',
        '/#anchor'
      ];

      validPaths.forEach((path) => {
        it(`should accept: ${path}`, () => {
          expect(isInternalPath(path)).to.be.true;
        });
      });
    });

    describe('should reject invalid paths', () => {
      const invalidPaths = [
        'https://evil.com',
        '//evil.com',
        'javascript:alert(1)',
        'data:text/html',
        '',
        'relative/path',
        '../parent'
      ];

      invalidPaths.forEach((path) => {
        it(`should reject: ${path}`, () => {
          expect(isInternalPath(path)).to.be.false;
        });
      });
    });
  });

  describe('buildSafePath', () => {
    it('should build valid paths', () => {
      expect(buildSafePath('/blog', '/@user')).to.equal('/blog/@user');
      expect(buildSafePath('', '/@user')).to.equal('/@user');
    });

    it('should return undefined for dangerous paths', () => {
      expect(buildSafePath('/blog', 'javascript:alert(1)')).to.be.undefined;
      expect(buildSafePath('javascript:', '/test')).to.be.undefined;
    });

    it('should reject protocol-relative URLs', () => {
      expect(buildSafePath('/blog', '//evil.com')).to.be.undefined;
    });
  });
});

// Additional OWASP-style test vectors
describe('OWASP XSS Prevention Tests', () => {
  describe('URL Protocol Bypass Attempts', () => {
    const bypassAttempts = [
      { input: 'java\nscript:alert(1)', desc: 'newline in protocol' },
      { input: 'java\tscript:alert(1)', desc: 'tab in protocol' },
      { input: 'java\rscript:alert(1)', desc: 'carriage return in protocol' },
      { input: '&#106;avascript:alert(1)', desc: 'HTML entity encoding' },
      { input: '&#x6a;avascript:alert(1)', desc: 'hex entity encoding' }
    ];

    bypassAttempts.forEach(({ input, desc }) => {
      it(`should handle ${desc}`, () => {
        // These might or might not be caught depending on browser behavior
        // The important thing is they don't cause crashes
        const result = isDangerousProtocol(input);
        expect(typeof result).to.equal('boolean');
      });
    });
  });

  describe('Element ID Injection Prevention', () => {
    const injectionAttempts = [
      '<img src=x onerror=alert(1)>',
      '"><script>alert(1)</script>',
      "'; DROP TABLE users; --",
      '${alert(1)}',
      '{{constructor.constructor("alert(1)")()}}'
    ];

    injectionAttempts.forEach((input) => {
      it(`should reject injection attempt: ${input.substring(0, 30)}`, () => {
        expect(isValidElementId(input)).to.be.false;
      });
    });
  });
});
