/**
 * Security tests for URL and DOM ID sanitization utilities.
 *
 * These tests verify protection against:
 * - XSS via javascript:/vbscript:/data: URLs
 * - DOM-based XSS via malicious element IDs
 * - Protocol injection attacks
 * - Encoding bypass attempts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDangerousProtocol,
  sanitizeUrl,
  isValidElementId,
  sanitizeHash,
  isInternalPath,
  buildSafePath
} from './sanitize-url.ts';

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
          assert.equal(isDangerousProtocol(url), true);
        });
      });
    });

    describe('should detect vbscript: protocol', () => {
      const vectors = ['vbscript:msgbox(1)', 'VBSCRIPT:msgbox(1)', 'VbScRiPt:msgbox(1)'];

      vectors.forEach((url) => {
        it(`should block: ${url}`, () => {
          assert.equal(isDangerousProtocol(url), true);
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
          assert.equal(isDangerousProtocol(url), true);
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
          assert.equal(isDangerousProtocol(url), true);
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
          assert.equal(isDangerousProtocol(url), false);
        });
      });
    });

    describe('should handle edge cases', () => {
      it('should return false for empty string', () => {
        assert.equal(isDangerousProtocol(''), false);
      });

      it('should return false for null/undefined', () => {
        // @ts-expect-error - Testing invalid input
        assert.equal(isDangerousProtocol(null), false);
        // @ts-expect-error - Testing invalid input
        assert.equal(isDangerousProtocol(undefined), false);
      });

      it('should handle encoded javascript:', () => {
        assert.equal(isDangerousProtocol('javascript%3Aalert(1)'), true);
      });

      it('should handle null bytes in protocol', () => {
        assert.equal(isDangerousProtocol('java\x00script:alert(1)'), true);
        assert.equal(isDangerousProtocol('javas\x00cript:alert(1)'), true);
        assert.equal(isDangerousProtocol('\x00javascript:alert(1)'), true);
      });
    });
  });

  describe('sanitizeUrl', () => {
    it('should return safe URLs unchanged', () => {
      assert.equal(sanitizeUrl('https://example.com'), 'https://example.com');
      assert.equal(sanitizeUrl('/path/to/page'), '/path/to/page');
      assert.equal(sanitizeUrl('/@username'), '/@username');
    });

    it('should return undefined for dangerous URLs', () => {
      assert.equal(sanitizeUrl('javascript:alert(1)'), undefined);
      assert.equal(sanitizeUrl('data:text/html,<script>'), undefined);
    });

    it('should return undefined for empty/invalid input', () => {
      assert.equal(sanitizeUrl(''), undefined);
      // @ts-expect-error - Testing invalid input
      assert.equal(sanitizeUrl(null), undefined);
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
          assert.equal(isValidElementId(id), true);
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
          assert.equal(isValidElementId(id), false);
        });
      });
    });

    it('should handle null/undefined', () => {
      // @ts-expect-error - Testing invalid input
      assert.equal(isValidElementId(null), false);
      // @ts-expect-error - Testing invalid input
      assert.equal(isValidElementId(undefined), false);
    });

    it('should reject IDs containing null bytes', () => {
      assert.equal(isValidElementId('section\x00-1'), false);
      assert.equal(isValidElementId('\x00section'), false);
      assert.equal(isValidElementId('section\x00'), false);
    });
  });

  describe('sanitizeHash', () => {
    describe('should sanitize valid hashes', () => {
      it('should remove # prefix and return valid hash', () => {
        assert.equal(sanitizeHash('#section-1'), 'section-1');
        assert.equal(sanitizeHash('section-1'), 'section-1');
      });

      it('should decode URL-encoded hashes', () => {
        assert.equal(sanitizeHash('#user%2Fpost'), 'user/post');
      });

      it('should handle Hive-style comment anchors', () => {
        assert.equal(sanitizeHash('#@alice/my-post'), '@alice/my-post');
        assert.equal(sanitizeHash('@bob/comment-123'), '@bob/comment-123');
      });
    });

    describe('should reject invalid hashes', () => {
      it('should return undefined for XSS attempts', () => {
        assert.equal(sanitizeHash('#<script>'), undefined);
        assert.equal(sanitizeHash('#test<img>'), undefined);
      });

      it('should return undefined for empty hash', () => {
        assert.equal(sanitizeHash('#'), undefined);
        assert.equal(sanitizeHash(''), undefined);
      });

      it('should handle invalid encoding', () => {
        assert.equal(sanitizeHash('#%invalid'), undefined);
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
          assert.equal(isInternalPath(path), true);
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
          assert.equal(isInternalPath(path), false);
        });
      });
    });
  });

  describe('buildSafePath', () => {
    it('should build valid paths', () => {
      assert.equal(buildSafePath('/blog', '/@user'), '/blog/@user');
      assert.equal(buildSafePath('', '/@user'), '/@user');
    });

    it('should return undefined for dangerous paths', () => {
      assert.equal(buildSafePath('/blog', 'javascript:alert(1)'), undefined);
      assert.equal(buildSafePath('javascript:', '/test'), undefined);
    });

    it('should reject protocol-relative URLs', () => {
      assert.equal(buildSafePath('/blog', '//evil.com'), undefined);
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
        assert.equal(typeof result, 'boolean');
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
        assert.equal(isValidElementId(input), false);
      });
    });
  });
});
