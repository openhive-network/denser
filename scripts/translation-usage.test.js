const { test } = require('node:test');
const assert = require('node:assert/strict');
const { collectKeys, extractKeys, extractPluralKeysWithoutCount, checkUsage } = require('./translation-usage');

test('collects dotted keys and the base name of plural keys', () => {
  const keys = collectKeys({ global: { close: 'Close', votes_one: '1 vote', votes_other: '{{count}} votes' } });
  assert.deepEqual([...keys].sort(), ['global.close', 'global.votes', 'global.votes_one', 'global.votes_other']);
});

test('extracts literal t() and i18nKey keys with their lines, skipping keys built at run time', () => {
  const source = [
    "const a = t('global.close');",
    'const b = t("cards.title", { n });',
    '<Trans i18nKey="cards.cross_posted" components={{}} />',
    't(`login_form.${type}`); t(prefix + \'x\');',
    "t('global.close')"
  ].join('\n');
  assert.deepEqual(
    extractKeys(source),
    new Map([
      ['global.close', [1, 5]],
      ['cards.title', [2]],
      ['cards.cross_posted', [3]]
    ])
  );
});

test('reports a used key no reference file has, with where it is used', () => {
  const sources = [
    { file: 'a.tsx', content: "t('global.close');\nt('global.gone');" },
    { file: 'b.tsx', content: "t('global.votes', { count });" }
  ];
  const { missing, used, usages } = checkUsage(sources, collectKeys({ global: { close: 'x', votes_other: 'y' } }));
  assert.deepEqual(missing, new Map([['global.gone', [{ file: 'a.tsx', lines: [2] }]]]));
  assert.deepEqual([...used].sort(), ['global.close', 'global.gone', 'global.votes']);
  assert.equal(usages, 3);
});

test('reports plural keys called without a count, in t() and <Trans>', () => {
  const pluralBases = new Set(['global.votes', 'global.days']);
  const source = [
    "t('global.votes');",
    "t('global.votes', { count: n });",
    "t('global.votes', options);",
    "t('global.days_one', { n });",
    '<Trans i18nKey="global.votes" components={{ b: <b /> }} />',
    '<Trans i18nKey="global.days" count={n} />',
    "t('global.close');",
    "t('global.days', {",
    '  count',
    '});'
  ].join('\n');
  assert.deepEqual(
    extractPluralKeysWithoutCount(source, pluralBases),
    new Map([
      ['global.votes', [1, 5]],
      ['global.days_one', [4]]
    ])
  );
});

test('checkUsage lists the plural keys used without a count', () => {
  const sources = [{ file: 'a.tsx', content: "t('global.votes');\nt('global.votes', { count });" }];
  const { withoutCount } = checkUsage(sources, collectKeys({ global: { votes_one: 'x', votes_other: 'y' } }));
  assert.deepEqual(withoutCount, new Map([['global.votes', [{ file: 'a.tsx', lines: [1] }]]]));
});
