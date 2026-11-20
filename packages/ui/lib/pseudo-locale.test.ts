import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PSEUDO_LOCALE,
  pseudoLocalize,
  pseudoLocalizeResources,
  withPseudoLocale,
  withPseudoLocaleLoader
} from './pseudo-locale.ts';

const LATIN_LETTER = /[A-Za-z]/;

describe('pseudoLocalize', () => {
  it('accents every letter, marks the text and makes it about 40 % longer', () => {
    const text = 'Witness Voting';
    const pseudo = pseudoLocalize(text);
    assert.match(pseudo, /^\[Ŵîţñéşş Ṽöţîñĝ ···.*\]$/);
    assert.doesNotMatch(pseudo, LATIN_LETTER);
    assert.equal(pseudo.length, 2 + text.length + Math.ceil(text.length * 0.4));
  });

  it('accents every ASCII letter, upper and lower case', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    assert.doesNotMatch(pseudoLocalize(letters), LATIN_LETTER);
  });

  it('keeps interpolations, nesting, tags, entities and URLs as they are', () => {
    const pseudo = pseudoLocalize('Hi {{name}}, $t(common.more) <0>see</0> <br/> &nbsp; https://hive.io/x');
    for (const kept of [
      '{{name}}',
      '$t(common.more)',
      '<0>',
      '</0>',
      '<br/>',
      '&nbsp;',
      'https://hive.io/x'
    ]) {
      assert.ok(pseudo.includes(kept), `${kept} in ${pseudo}`);
    }
    assert.ok(pseudo.startsWith('[Ĥî '));
  });

  it('pads with breakable chunks, so a long text gets no long unbreakable run', () => {
    const pseudo = pseudoLocalize('word '.repeat(60).trim());
    assert.doesNotMatch(pseudo, /·{4}/);
  });

  it('leaves an empty text empty', () => {
    assert.equal(pseudoLocalize(''), '');
  });
});

describe('pseudoLocalizeResources', () => {
  it('keeps the keys, plural forms included, and localizes every string', () => {
    const resources = { a: { b_one: '{{count}} vote', b_other: '{{count}} votes' }, list: ['x'], n: 3 };
    assert.deepEqual(pseudoLocalizeResources(resources), {
      a: { b_one: pseudoLocalize('{{count}} vote'), b_other: pseudoLocalize('{{count}} votes') },
      list: [pseudoLocalize('x')],
      n: 3
    });
  });
});

describe('withPseudoLocaleLoader', () => {
  const loadNamespace = async (language: string, namespace: string) => ({
    default: { title: `${namespace} in ${language}` }
  });

  it('answers the pseudo-locale with the pseudo-localized en namespace', async () => {
    const loaded = await withPseudoLocaleLoader(loadNamespace)(PSEUDO_LOCALE, 'common');
    assert.deepEqual(loaded, { title: pseudoLocalize('common in en') });
  });

  it('passes every other language through', async () => {
    assert.deepEqual(await withPseudoLocaleLoader(loadNamespace)('pl', 'common'), {
      default: { title: 'common in pl' }
    });
  });
});

describe('withPseudoLocale', () => {
  it('leaves the languages alone outside development without REACT_APP_PSEUDO_LOCALE', () => {
    assert.deepEqual(withPseudoLocale(['en', 'pl']), ['en', 'pl']);
  });

  it('appends the pseudo-locale with REACT_APP_PSEUDO_LOCALE=true', () => {
    process.env.REACT_APP_PSEUDO_LOCALE = 'true';
    try {
      assert.deepEqual(withPseudoLocale(['en', 'pl']), ['en', 'pl', PSEUDO_LOCALE]);
    } finally {
      delete process.env.REACT_APP_PSEUDO_LOCALE;
    }
  });
});
