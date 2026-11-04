import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureLocaleCookie, readLocaleCookie, writeLocaleCookie } from './locale-cookie.ts';

/**
 * A path-aware cookie jar standing in for `document.cookie`: a cookie is keyed by name, domain and path,
 * and reading lists the ones visible at `location.pathname`, longest path first, as browsers do. Like
 * browsers, the last of a repeated attribute wins, an empty `path` falls back to the default path and
 * `max-age` takes precedence over `expires`.
 */
class CookieJar {
  private cookies = new Map<string, { name: string; value: string; path: string; domain?: string }>();
  pathname = '/';
  written: string[] = [];

  private defaultPath() {
    const lastSlash = this.pathname.lastIndexOf('/');
    return lastSlash <= 0 ? '/' : this.pathname.slice(0, lastSlash);
  }

  get cookie() {
    return [...this.cookies.values()]
      .filter(({ path }) => path === '/' || this.pathname === path || this.pathname.startsWith(`${path}/`))
      .sort((a, b) => b.path.length - a.path.length)
      .map(({ name, value }) => `${name}=${value}`)
      .join('; ');
  }

  set cookie(header: string) {
    this.written.push(header);
    const [pair, ...attributes] = header.split(';').map((part) => part.trim());
    const [name, value] = pair.split('=');
    const attribute = (key: string) =>
      attributes.findLast((part) => part.toLowerCase().startsWith(`${key}=`))?.split('=')[1];
    const path = attribute('path') || this.defaultPath();
    const domain = attribute('domain') || undefined;
    const maxAge = attribute('max-age');
    const expires = attribute('expires');
    const isExpired =
      maxAge !== undefined ? Number(maxAge) <= 0 : expires !== undefined && new Date(expires).getTime() < Date.now();
    const key = `${name}|${domain ?? ''}|${path}`;
    if (isExpired) {
      this.cookies.delete(key);
    } else {
      this.cookies.set(key, { name, value, path, domain });
    }
  }

  stored() {
    return [...this.cookies.values()]
      .map(({ name, value, path, domain }) => `${name}=${value}@${domain ?? ''}${path}`)
      .sort();
  }

  clear() {
    this.cookies.clear();
    this.written = [];
  }
}

const jar = new CookieJar();
Object.defineProperty(globalThis, 'document', { value: jar, configurable: true });
Object.defineProperty(globalThis, 'window', {
  value: {
    location: {
      get pathname() {
        return jar.pathname;
      }
    }
  },
  configurable: true
});

beforeEach(() => {
  jar.clear();
  jar.pathname = '/';
});

describe('writeLocaleCookie', () => {
  it('writes one origin-wide cookie that both base paths see', () => {
    jar.pathname = '/wallet/@alice/transfers';
    writeLocaleCookie('pl');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=pl@/']);
    jar.pathname = '/blog/trending';
    assert.equal(readLocaleCookie(), 'pl');
  });

  it('replaces a copy scoped to the current base path instead of adding a second cookie', () => {
    jar.pathname = '/blog/trending';
    jar.cookie = 'NEXT_LOCALE=en; SameSite=Lax';
    writeLocaleCookie('pl');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=pl@/']);
  });

  it('switching in one app then the other leaves a single cookie with the last choice', () => {
    jar.pathname = '/wallet/@alice';
    writeLocaleCookie('pl');
    jar.pathname = '/blog/trending';
    writeLocaleCookie('en');
    jar.pathname = '/wallet/@alice';
    writeLocaleCookie('es');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=es@/']);
  });

  it('still expires stale copies scoped to every ancestor of a normal path', () => {
    jar.pathname = '/blog/@alice/posts';
    jar.cookie = 'NEXT_LOCALE=pl; path=/blog';
    jar.cookie = 'NEXT_LOCALE=es; path=/blog/@alice';
    jar.cookie = 'NEXT_LOCALE=fr; path=/blog/@alice/posts';
    writeLocaleCookie('en');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=en@/']);
  });

  it('keeps cookie attributes in a path segment out of the cookies it writes', () => {
    jar.pathname = '/blog/x;max-age=31536000;domain=example.com;path=';
    jar.cookie = 'NEXT_LOCALE=pl; path=/blog';
    writeLocaleCookie('en');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=en@/']);
  });

  it('expires only the safe prefixes of a path with a comma, whitespace or control character', () => {
    for (const segment of ['a,b', 'a b', 'a\tb', 'a\u0000b']) {
      jar.clear();
      jar.pathname = `/blog/${segment}`;
      writeLocaleCookie('en');
      const paths = jar.written.map((header) => header.match(/; path=([^;]*)/)?.[1]);
      assert.deepEqual(paths, ['/blog', '/'], JSON.stringify(segment));
    }
  });
});

describe('readLocaleCookie', () => {
  it('returns an empty string without a cookie', () => {
    assert.equal(readLocaleCookie(), '');
  });

  it('prefers the origin-wide copy over a path-scoped one, as the server does', () => {
    jar.pathname = '/blog/trending';
    jar.cookie = 'NEXT_LOCALE=pl; path=/blog';
    jar.cookie = 'NEXT_LOCALE=en; path=/';
    assert.equal(readLocaleCookie(), 'en');
  });
});

describe('ensureLocaleCookie', () => {
  it('writes no cookie on a first visit in the default language', () => {
    assert.equal(ensureLocaleCookie('en'), 'en');
    assert.equal(ensureLocaleCookie('en', ['en', 'pl']), 'en');
    assert.deepEqual(jar.written, []);
  });

  it('writes a fallback other than the default on a first visit', () => {
    assert.equal(ensureLocaleCookie('pl'), 'pl');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=pl@/']);
  });

  it('keeps a default-valued cookie', () => {
    jar.cookie = 'NEXT_LOCALE=en; path=/';
    assert.equal(ensureLocaleCookie('en'), 'en');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=en@/']);
  });

  it('keeps an existing value over the fallback', () => {
    jar.cookie = 'NEXT_LOCALE=pl; path=/';
    assert.equal(ensureLocaleCookie('en'), 'pl');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=pl@/']);
  });

  it('replaces a value outside the accepted locales', () => {
    jar.cookie = 'NEXT_LOCALE=xx; path=/';
    assert.equal(ensureLocaleCookie('en', ['en', 'pl']), 'en');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=en@/']);
  });

  it('moves a lone path-scoped copy to the origin-wide cookie', () => {
    jar.pathname = '/blog/trending';
    jar.cookie = 'NEXT_LOCALE=pl';
    assert.equal(ensureLocaleCookie('en'), 'pl');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=pl@/']);
  });

  it('collapses duplicates into the value the server resolves', () => {
    jar.pathname = '/blog/@alice/posts';
    jar.cookie = 'NEXT_LOCALE=pl; path=/blog';
    jar.cookie = 'NEXT_LOCALE=en; path=/';
    assert.equal(ensureLocaleCookie('en'), 'en');
    assert.deepEqual(jar.stored(), ['NEXT_LOCALE=en@/']);
  });
});
