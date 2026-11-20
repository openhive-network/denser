const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  collectKeys,
  extractKeys,
  extractKeyUsages,
  extractPluralKeysWithoutCount,
  checkUsage
} = require('./translation-usage');

/** One app rendering the sources, whose default namespace has `messages`. */
const app = (messages, name = 'blog', ns = 'common_blog') => ({
  name,
  namespaces: new Map([[ns, collectKeys(messages)]])
});

test('collects dotted keys and the base name of plural keys', () => {
  const keys = collectKeys({
    global: { close: 'Close', votes_one: '1 vote', votes_other: '{{count}} votes' }
  });
  assert.deepEqual([...keys].sort(), [
    'global.close',
    'global.votes',
    'global.votes_one',
    'global.votes_other'
  ]);
});

test('extracts literal t() and i18nKey keys with their lines, skipping keys built at run time', () => {
  const source = [
    "const a = t('global.close');",
    'const b = t("cards.title", { n });',
    '<Trans i18nKey="cards.cross_posted" components={{}} />',
    "t(`login_form.${type}`); t(prefix + 'x');",
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
  const { missing, used, usages } = checkUsage(sources, [app({ global: { close: 'x', votes_other: 'y' } })]);
  assert.deepEqual(missing, new Map([['global.gone', [{ file: 'a.tsx', lines: [2], renderers: ['blog'] }]]]));
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
    '});',
    "t('global.votes', { value: item.count });",
    "t('global.days', { ...rest, 'count': n });",
    '<Trans i18nKey="global.days" values={{ total: page.count }} />'
  ].join('\n');
  assert.deepEqual(
    extractPluralKeysWithoutCount(source, pluralBases),
    new Map([
      ['global.votes', [1, 11, 5]],
      ['global.days_one', [4]],
      ['global.days', [13]]
    ])
  );
});

test('checkUsage lists the plural keys used without a count', () => {
  const sources = [{ file: 'a.tsx', content: "t('global.votes');\nt('global.votes', { count });" }];
  const { withoutCount } = checkUsage(sources, [app({ global: { votes_one: 'x', votes_other: 'y' } })]);
  assert.deepEqual(withoutCount, new Map([['global.votes', [{ file: 'a.tsx', lines: [1] }]]]));
});

test('extracts the namespace a call names with a literal', () => {
  const source = [
    "t('search_mode.sort_by', { ns: 'common_blog' });",
    "t('global.close', { ns: SMART_SIGNER_NAMESPACE });",
    "t('witnesses_page.gap', {",
    "  ns: 'common_wallet',",
    '  count',
    '});',
    '<Trans i18nKey="a.b" ns="smart-signer" />',
    "t('global.close')"
  ].join('\n');
  assert.deepEqual(extractKeyUsages(source), [
    { key: 'search_mode.sort_by', line: 1, ns: 'common_blog' },
    { key: 'global.close', line: 2, ns: undefined },
    { key: 'witnesses_page.gap', line: 3, ns: 'common_wallet' },
    { key: 'a.b', line: 7, ns: 'smart-signer' },
    { key: 'global.close', line: 8, ns: undefined }
  ]);
});

test('a shared component needs its key in every app that renders it, unless it names one app', () => {
  const renderers = [
    app({ global: { close: 'Close' }, search_mode: { sort_by: 'Sort by' } }),
    app({ global: { close: 'Close' }, witnesses_page: { gap: 'Gap' } }, 'wallet', 'common_wallet')
  ];
  const sources = [
    {
      file: 'probe.tsx',
      content:
        "t('global.close');\nt('search_mode.sort_by');\nt('witnesses_page.gap');\nt('search_mode.sort_by', { ns: 'common_blog' });"
    },
    {
      file: 'wallet-only.ts',
      content:
        "t('witnesses_page.gap', { ns: 'common_wallet' });\nt('search_mode.sort_by', { ns: 'common_wallet' });"
    },
    { file: 'unknown-ns.ts', content: "t('global.close', { ns: 'common_chat' });" }
  ];
  const { missing } = checkUsage(sources, renderers);
  assert.deepEqual(
    missing,
    new Map([
      [
        'search_mode.sort_by',
        [
          { file: 'probe.tsx', lines: [2], renderers: ['wallet'] },
          { file: 'wallet-only.ts', lines: [2], renderers: ['wallet'] }
        ]
      ],
      ['witnesses_page.gap', [{ file: 'probe.tsx', lines: [3], renderers: ['blog'] }]],
      ['global.close', [{ file: 'unknown-ns.ts', lines: [1], renderers: ['blog', 'wallet'] }]]
    ])
  );
});

test('a key of a namespace both apps load, or of its fallback in each app, passes', () => {
  const signer = collectKeys({ login_form: { title: 'Sign in' } });
  const renderers = [
    {
      name: 'blog',
      namespaces: new Map([
        ['smart-signer', signer],
        ['common_blog', collectKeys({ global: { close: 'x' } })]
      ])
    },
    {
      name: 'wallet',
      namespaces: new Map([
        ['smart-signer', signer],
        ['common_wallet', collectKeys({ global: { close: 'y' } })]
      ])
    }
  ];
  const sources = [
    { file: 'a.tsx', content: "t('login_form.title');\nt('global.close', { ns: 'smart-signer' });" }
  ];
  assert.deepEqual(checkUsage(sources, renderers).missing, new Map());
});
