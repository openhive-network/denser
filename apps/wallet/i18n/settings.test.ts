import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultLocale, languages, resolveLocale } from './settings.ts';

describe('resolveLocale', () => {
  it('keeps a language the wallet has translations for', () => {
    for (const lang of languages) {
      assert.equal(resolveLocale(lang), lang);
    }
  });

  it('falls back to the default language without a cookie', () => {
    assert.equal(resolveLocale(undefined), defaultLocale);
    assert.equal(resolveLocale(''), defaultLocale);
  });

  it('falls back to the default language for a tag the wallet does not translate', () => {
    for (const value of ['en-x-123', 'pl-PL', 'de', 'EN', '%%%', 'not_a_locale!']) {
      assert.equal(resolveLocale(value), defaultLocale, value);
    }
  });
});
