import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAcceptLanguage, pickSupportedLocale } from './locale-negotiation.ts';

const SUPPORTED = ['ar', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'ru', 'zh'];

describe('pickSupportedLocale', () => {
  it('picks the first supported language by its primary subtag, ignoring case', () => {
    assert.equal(pickSupportedLocale(['pl-PL', 'en-US'], SUPPORTED), 'pl');
    assert.equal(pickSupportedLocale(['ZH-tw'], SUPPORTED), 'zh');
  });

  it('skips unsupported languages before a supported one', () => {
    assert.equal(pickSupportedLocale(['sw', 'de-DE', 'pl'], SUPPORTED), 'pl');
  });

  it('is null when no language is supported', () => {
    assert.equal(pickSupportedLocale(['sw-KE', 'tlh'], SUPPORTED), null);
    assert.equal(pickSupportedLocale([], SUPPORTED), null);
  });
});

describe('parseAcceptLanguage', () => {
  it('orders by q, keeping the header order among equal weights', () => {
    assert.deepEqual(parseAcceptLanguage('en;q=0.5, pl-PL, pl;q=0.9, de;q=0.9'), ['pl-PL', 'pl', 'de', 'en']);
  });

  it('drops *, refused ranges and empty entries', () => {
    assert.deepEqual(parseAcceptLanguage('*, fr;q=0, ,es;q=0.1'), ['es']);
  });

  it('is empty without a header', () => {
    assert.deepEqual(parseAcceptLanguage(null), []);
    assert.deepEqual(parseAcceptLanguage(''), []);
  });

  it('gives Polish for a Polish browser and nothing supported for Swahili', () => {
    assert.equal(pickSupportedLocale(parseAcceptLanguage('pl-PL,pl;q=0.9,en-US;q=0.8'), SUPPORTED), 'pl');
    assert.equal(pickSupportedLocale(parseAcceptLanguage('sw'), SUPPORTED), null);
  });
});
