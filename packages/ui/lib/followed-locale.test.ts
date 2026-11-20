import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import Big from 'big.js';

// Repo-style extensionless relative imports need the `.ts` spelled out for node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './locale-format-cache') return nextResolve('./locale-format-cache.ts', context);
    return nextResolve(specifier, context);
  }
});

const { followedLocale } = await import('./followed-locale.ts');
const { getRoundedAbbreveration } = await import('./math-utils.ts');

describe('followedLocale', () => {
  it("is the server's locale before i18next switches language", () => {
    assert.equal(followedLocale('en', null), 'en');
  });

  it('is the language i18next switched to during the same server render', () => {
    assert.equal(followedLocale('en', { serverLocale: 'en', language: 'pl' }), 'pl');
  });

  it('is the newer server render once it renders another locale', () => {
    assert.equal(followedLocale('fr', { serverLocale: 'en', language: 'pl' }), 'fr');
  });

  it("formats a proposal's HP total in pl as soon as the texts are Polish, before the server renders pl", () => {
    const locale = followedLocale('en', { serverLocale: 'en', language: 'pl' });
    assert.equal(`${getRoundedAbbreveration(Big('51550000'), locale)} HP`, '51,55M HP');
  });
});
