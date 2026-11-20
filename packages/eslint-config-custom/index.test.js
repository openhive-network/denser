const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ESLint } = require('eslint');

const eslint = new ESLint({ cwd: __dirname, useEslintrc: false, overrideConfig: require('./index.js') });

/** The lines of `code` (as `filePath`) the translation guard reports. */
async function untranslatedLines(code, filePath = 'component.tsx') {
  const [result] = await eslint.lintText(code, { filePath });
  const fatal = result.messages.find((message) => message.fatal);
  assert.equal(fatal, undefined, fatal?.message);
  return result.messages
    .filter((message) => message.ruleId === '@hive/i18n/no-untranslated-text')
    .map((message) => message.line);
}

test('reports text in JSX children, attributes and expressions', async () => {
  const code = [
    'export const A = ({ n, user }) => (',
    '  <div>',
    '    <p>Loading</p>',
    '    <img alt={`${user} profile picture`} title="Avatar" />',
    "    <span>{n > 1 ? 'items' : 'item'}</span>",
    '    <span>{`Total ${n}`}</span>',
    "    {'Close'}",
    '    {`Close dialog`}',
    '  </div>',
    ');'
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code), [3, 4, 4, 5, 5, 6, 7, 8]);
});

test('reports toast and option text and string defaults of label props', async () => {
  const code = [
    "import { toast } from 'x';",
    "export function save(count, closeLabel = 'Close') {",
    "  toast({ title: 'Saved', description: `Saved ${count} items` });",
    "  toast({ message: 'Done' });",
    "  return { successToast: () => ({ title: 'Pinned' }), options: [{ value: 'a', label: 'Newest' }] };",
    '}',
    "export const Dialog = ({ label = 'Close', text = 'Are you sure?' }) => null;"
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code), [2, 3, 3, 3, 4, 5, 5, 7, 7]);
});

test('passes translated text, names every locale keeps, punctuation, numbers, URLs and keys', async () => {
  const code = [
    'export const A = ({ t, n }) => (',
    "  <div title={t('a.b')}>",
    "    <p>{t('global.loading')}</p>",
    '    <span>{n} HBD · 50% HP · (RC) {n}%</span>',
    '    <b>nsfw</b> <i>Hive Keychain</i> <i>HIVE POWER</i>',
    '    <a href="https://peakd.com">https://peakd.com</a>',
    '    <span>{`${n}px`}</span>',
    '  </div>',
    ');',
    "export const meta = { title: 'Hive', label: 'account_keys.this_session', description: `${'x'} - Hive` };",
    'export const key = (type) => ({ title: `login_form.enter_key_title_${type}` });'
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code), []);
});

test('lets test data name objects but still checks JSX text in tests', async () => {
  const code = [
    "const post = { title: 'My post', description: 'body' };",
    'export const A = () => <p>Loading</p>;'
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code, 'component.test.tsx'), [2]);
});

/** The lines of `code` (as `filePath`) whose reports carry `messageStart`. */
async function reportedLines(code, messageStart, filePath = 'component.tsx') {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages
    .filter((message) => message.message.startsWith(messageStart))
    .map((message) => message.line);
}

test('reports toFixed digits shown to the user, toLocale*String and Intl formatters', async () => {
  const code = [
    'export const A = ({ t, amount, date }) => {',
    "  const label = amount.toFixed(3) + ' HBD';",
    '  const text = `${amount.toFixed(2)} HIVE`;',
    "  const title = t('a.b', { value: amount.toFixed(2) });",
    "  const when = date.toLocaleDateString() + date.toLocaleString('pl');",
    "  const format = new Intl.NumberFormat('en');",
    '  const input = amount.toFixed(3);',
    '  return <p title={title}>{amount.toFixed(1)}{label}{when}{format}{input}{text}</p>;',
    '};'
  ].join('\n');
  assert.deepEqual(await reportedLines(code, 'Format numbers'), [2, 3, 4, 5, 5, 6, 8]);
});

test('reports translated fragments joined into a sentence, not a title with the site name', async () => {
  const code = [
    'export const a = (t, n, i18n) => [',
    "  t('a.share_on') + 'Facebook',",
    "  `${n} ${t('global.time.hours')}`,",
    "  `${t('a.reason')} more text`,",
    "  [t('a.first'), t('a.second')].join(' '),",
    "  i18n.t('a.b') + n,",
    "  `${t('page_titles.market')} - Hive`,",
    "  `Hive Wallet - ${t('page_titles.home')}`,",
    "  `${t('market_page.total')} HBD($)`,",
    "  t('a.b', { n })",
    '];'
  ].join('\n');
  assert.deepEqual(await reportedLines(code, 'Do not join'), [2, 3, 4, 5, 5, 6]);
});

test('lets tests format numbers and join text', async () => {
  const code = "export const expected = (n, t) => n.toFixed(3) + ' HBD' + t('a.b');";
  assert.deepEqual(await reportedLines(code, 'Format numbers', 'component.test.ts'), []);
  assert.deepEqual(await reportedLines(code, 'Do not join', 'component.test.ts'), []);
});

test('reports text in other attributes, nested conditionals and scripts without Latin letters', async () => {
  const code = [
    'export const A = ({ a, b, c }) => (',
    '  <div>',
    "    <Field label=\"Save\" closeLabel={a ? 'Close' : 'Dismiss'} />",
    '    <meta name="description" content="A place for posts" />',
    "    <span>{a ? 'x' : b ? 'Loading' : c || 'Retry'}</span>",
    '    <p>保存</p>',
    "    <span>{'読み込み中'}</span>",
    '    <Hint tip="Click to open the post" />',
    '  </div>',
    ');'
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code), [3, 3, 3, 4, 5, 5, 5, 6, 7, 8]);
});

test('passes attributes that carry code, not text', async () => {
  const code = [
    'export const A = ({ t, dark }) => (',
    '  <div className="flex gap-2" id="main" data-testid="post-list">',
    "    <meta name=\"theme-color\" content={dark ? '#030711' : '#ffffff'} />",
    '    <Button variant="outline" size="sm" label={t(\'global.close\')} side="left" />',
    '    <Field label="account_keys.this_session" />',
    '  </div>',
    ');'
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code), []);
});

test('reports toFixed in attributes, Trans values, string chains and display helpers, and Intl without new', async () => {
  const code = [
    "import dayjs from 'dayjs';",
    'export const formatRcSummary = (x) => x.toFixed(2);',
    'export function amountLabel(x) {',
    '  return String(x.toFixed(3));',
    '}',
    'export const A = ({ x, date }) => {',
    "  const format = Intl.NumberFormat('en');",
    '  return (',
    '    <p title={x.toFixed(3)}>',
    '      <Trans i18nKey="a.b" values={{ amount: x.toFixed(3) }} />',
    "      {x.toFixed(3).replace(/0+$/, '')}",
    "      {dayjs(date).utc().format('LL')}",
    '      <input value={x.toFixed(3)} />',
    '      <PriceButton price={x.toFixed(6)} />',
    '    </p>',
    '  );',
    '};',
    'export const formatRcInput = (x) => x.toFixed(9);',
    "export const toChain = (x) => x.toFixed(3) && dayjs(x).format('YYYY-MM-DD');"
  ].join('\n');
  assert.deepEqual(await reportedLines(code, 'Format numbers'), [2, 4, 7, 9, 10, 11, 12]);
});

test('a disable of the text rule leaves the formatting and sentence rules on', async () => {
  const code = [
    '/* eslint-disable @hive/i18n/no-untranslated-text -- an English legal page */',
    'export const A = ({ t, x }) => (',
    '  <p>',
    '    Terms of service',
    '    {/* eslint-disable-next-line @hive/i18n/no-untranslated-text -- the line still shows digits */}',
    "    {x.toFixed(3)} {t('a.b') + 'more'}",
    '  </p>',
    ');'
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code), []);
  assert.deepEqual(await reportedLines(code, 'Format numbers'), [6]);
  assert.deepEqual(await reportedLines(code, 'Do not join'), [6]);
});

test('reports a translated fragment rendered beside another expression, not beside markup', async () => {
  const code = [
    'export const A = ({ t, items, n, open, locale }) => (',
    '  <div>',
    "    <span>{t('profile.claim_rewards')}{formatList(items, locale)}</span>",
    "    <span>{t('a.by')} {n}</span>",
    "    <span>{t('a.label')}: {n}</span>",
    "    <span>{t('a.menu')}{open && <b>{n}</b>}</span>",
    '    <span>{t(\'a.reblogged\')} <Link href="/x">{n}</Link></span>',
    '  </div>',
    ');'
  ].join('\n');
  assert.deepEqual(await reportedLines(code, 'Do not join'), [3, 4]);
});
