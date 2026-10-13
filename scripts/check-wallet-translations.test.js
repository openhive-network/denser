const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compareLocale, getLeaves } = require('./check-wallet-translations');

const reference = getLeaves({
  global: { save: 'Save', exclude_less_than_one: 'Exclude less than 1 HBD' },
  profile: {
    hidden_one: '{{count}} transfer hidden',
    hidden_other: '{{count}} transfers hidden',
    hidden_both_other: '{{count}} hidden ({{muted}} muted)',
    savings: 'Rate {{rate}}% (voted by <0>Witnesses</0>)'
  }
});

const complete = {
  global: { save: 'Zapisz', exclude_less_than_one: 'Nie pokazuj mniej niż 1 HBD' },
  profile: {
    hidden_one: 'Ukryto {{count}} przelew',
    hidden_few: 'Ukryto {{count}} przelewy',
    hidden_many: 'Ukryto {{count}} przelewów',
    hidden_other: 'Ukryto {{count}} przelewu',
    hidden_both_few: 'Ukryto {{count}} ({{muted}} wyciszonych)',
    hidden_both_many: 'Ukryto {{count}} ({{muted}} wyciszonych)',
    hidden_both_other: 'Ukryto {{count}} ({{muted}} wyciszonych)',
    savings: 'Oprocentowanie {{rate}}% (wg <0>Świadków</0>)'
  }
};

test('a locale with every key, its own plural categories and matching placeholders passes', () => {
  assert.deepEqual(compareLocale(reference, getLeaves(complete), 'pl'), {
    missing: [],
    extra: [],
    placeholders: [],
    untranslated: []
  });
});

test('a locale with a single plural category only needs _other', () => {
  const ja = getLeaves({
    global: { save: '保存', exclude_less_than_one: '1 HBD 未満を除外' },
    profile: {
      hidden_other: '{{count}}件を非表示',
      hidden_both_other: '{{count}}件を非表示（{{muted}}件）',
      savings: '利率 {{rate}}%（<0>ウィットネス</0>）'
    }
  });
  assert.deepEqual(compareLocale(reference, ja, 'ja'), {
    missing: [],
    extra: [],
    placeholders: [],
    untranslated: []
  });
});

test('missing keys, missing plural categories and keys outside the locale categories are reported', () => {
  const { hidden_few: _dropped, ...profile } = complete.profile;
  const pl = getLeaves({
    global: { save: 'Zapisz' },
    profile: { ...profile, hidden_two: 'Ukryto {{count}} przelewy', stale: 'Nieużywany' }
  });
  const { missing, extra } = compareLocale(reference, pl, 'pl');
  assert.deepEqual(missing.sort(), ['global.exclude_less_than_one', 'profile.hidden_few']);
  assert.deepEqual(extra.sort(), ['profile.hidden_two', 'profile.stale']);
});

test('the _one form may be omitted only where English omits it', () => {
  const pl = getLeaves(complete);
  pl.delete('profile.hidden_one');
  assert.deepEqual(compareLocale(reference, pl, 'pl').missing, ['profile.hidden_one']);
  assert.equal(pl.has('profile.hidden_both_one'), false);
});

test('dropped, renamed or added placeholders and Trans tags are reported', () => {
  const pl = getLeaves({
    ...complete,
    profile: {
      ...complete.profile,
      hidden_many: 'Ukryto {{amount}} przelewów',
      hidden_both_other: 'Ukryto {{count}}',
      savings: 'Oprocentowanie {{rate}}% (wg Świadków)'
    }
  });
  assert.deepEqual(compareLocale(reference, pl, 'pl').placeholders, [
    'profile.hidden_many: expected [{{count}}], got [{{amount}}]',
    'profile.hidden_both_other: expected [{{count}} {{muted}}], got [{{count}}]',
    'profile.savings: expected [</0> <0> {{rate}}], got [{{rate}}]'
  ]);
});

test('sentences copied verbatim from English are reported as untranslated', () => {
  const pl = getLeaves({
    ...complete,
    global: { ...complete.global, exclude_less_than_one: 'Exclude less than 1 HBD' },
    profile: { ...complete.profile, hidden_both_other: '{{count}} hidden ({{muted}} muted)' }
  });
  assert.deepEqual(compareLocale(reference, pl, 'pl').untranslated, [
    'global.exclude_less_than_one',
    'profile.hidden_both_other'
  ]);
});

test('short labels identical to English are not reported as untranslated', () => {
  const pl = getLeaves({ ...complete, global: { ...complete.global, save: 'Save' } });
  assert.deepEqual(compareLocale(reference, pl, 'pl').untranslated, []);
});
