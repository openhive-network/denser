import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFirstVisitLocale, withRequestCookie } from './locale-detection.ts';
import { isPublicCacheableRequest } from './public-cache.ts';

const LOCALES = ['ar', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh'];
const POLISH_BROWSER = 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7';

describe('detectFirstVisitLocale', () => {
  test('a Polish browser without a language cookie gets Polish', () => {
    assert.equal(detectFirstVisitLocale([], POLISH_BROWSER, LOCALES), 'pl');
    assert.equal(detectFirstVisitLocale([{ name: 'denser_human', value: '1' }], POLISH_BROWSER, LOCALES), 'pl');
  });

  test('an unsupported or English browser, or none, keeps the default: no cookie to set', () => {
    assert.equal(detectFirstVisitLocale([], 'sw-KE,sw;q=0.9', LOCALES), null);
    assert.equal(detectFirstVisitLocale([], 'en-GB,pl;q=0.5', LOCALES), null);
    assert.equal(detectFirstVisitLocale([], null, LOCALES), null);
  });

  test('a language cookie, also English or one this app lacks, is never overridden', () => {
    for (const value of ['en', 'es', 'de', '']) {
      assert.equal(detectFirstVisitLocale([{ name: 'NEXT_LOCALE', value }], POLISH_BROWSER, LOCALES), null);
    }
  });

  test('only the app\'s languages are picked', () => {
    assert.equal(detectFirstVisitLocale([], 'pl,es;q=0.5', ['en', 'es']), 'es');
  });

  test('the detected language takes the page out of the shared cache', () => {
    const locale = detectFirstVisitLocale([], POLISH_BROWSER, LOCALES);
    assert.equal(
      isPublicCacheableRequest({
        method: 'GET',
        pathname: '/trending',
        searchParams: new URLSearchParams(),
        headers: new Headers(),
        cookies: [{ name: 'NEXT_LOCALE', value: locale ?? '' }]
      }),
      false
    );
  });
});

describe('withRequestCookie', () => {
  test('adds the cookie to the request\'s cookies', () => {
    assert.equal(withRequestCookie('a=1; b=2', 'NEXT_LOCALE', 'pl'), 'a=1; b=2; NEXT_LOCALE=pl');
  });

  test('is the cookie alone without other cookies', () => {
    assert.equal(withRequestCookie(null, 'NEXT_LOCALE', 'pl'), 'NEXT_LOCALE=pl');
    assert.equal(withRequestCookie('  ', 'NEXT_LOCALE', 'pl'), 'NEXT_LOCALE=pl');
  });
});
