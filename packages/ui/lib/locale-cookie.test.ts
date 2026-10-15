import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensureLocaleCookie, readLocaleCookie, writeLocaleCookie } from './locale-cookie.ts';

/**
 * A path-aware cookie jar standing in for `document.cookie`: a cookie is keyed by name and path, and
 * reading lists the ones visible at `location.pathname`, longest path first, as browsers do.
 */
class CookieJar {
  private cookies = new Map<string, { name: string; value: string; path: string }>();
  pathname = '/';

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
    const [pair, ...attributes] = header.split(';').map((part) => part.trim());
    const [name, value] = pair.split('=');
    const attribute = (key: string) =>
      attributes.find((part) => part.toLowerCase().startsWith(`${key}=`))?.split('=')[1];
    const path = attribute('path') ?? this.defaultPath();
    const expires = attribute('expires');
    if (expires && new Date(expires).getTime() < Date.now()) {
      this.cookies.delete(`${name}|${path}`);
    } else {
      this.cookies.set(`${name}|${path}`, { name, value, path });
    }
  }

  stored() {
    return [...this.cookies.values()].map(({ name, value, path }) => `${name}=${value}@${path}`).sort();
  }

  clear() {
    this.cookies.clear();
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
  it('writes the fallback on a first visit', () => {
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
