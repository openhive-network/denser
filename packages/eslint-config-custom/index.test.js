const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ESLint } = require('eslint');

const eslint = new ESLint({ cwd: __dirname, useEslintrc: false, overrideConfig: require('./index.js') });

/** The lines of `code` (as `filePath`) the translation guard reports. */
async function untranslatedLines(code, filePath = 'component.tsx') {
  const [result] = await eslint.lintText(code, { filePath });
  const fatal = result.messages.find((message) => message.fatal);
  assert.equal(fatal, undefined, fatal?.message);
  return result.messages.filter((message) => message.ruleId === 'no-restricted-syntax').map((message) => message.line);
}

test('reports text in JSX children, attributes and expressions', async () => {
  const code = [
    'export const A = ({ n, user }) => (',
    '  <div>',
    '    <p>Loading</p>',
    "    <img alt={`${user} profile picture`} title=\"Avatar\" />",
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
    'export function save(count, closeLabel = \'Close\') {',
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
    "export const A = ({ t, n }) => (",
    "  <div title={t('a.b')}>",
    "    <p>{t('global.loading')}</p>",
    '    <span>{n} HBD · 50% HP · (RC) {n}%</span>',
    '    <b>nsfw</b> <i>Hive Keychain</i> <i>HIVE POWER</i>',
    '    <a href="https://peakd.com">https://peakd.com</a>',
    '    <span>{`${n}px`}</span>',
    '  </div>',
    ');',
    "export const meta = { title: 'Hive', label: 'account_keys.this_session', description: `${'x'} - Hive` };",
    "export const key = (type) => ({ title: `login_form.enter_key_title_${type}` });"
  ].join('\n');
  assert.deepEqual(await untranslatedLines(code), []);
});

test('lets test data name objects but still checks JSX text in tests', async () => {
  const code = ["const post = { title: 'My post', description: 'body' };", 'export const A = () => <p>Loading</p>;'].join(
    '\n'
  );
  assert.deepEqual(await untranslatedLines(code, 'component.test.tsx'), [2]);
});

/** The lines of `code` (as `filePath`) whose reports carry `messageStart`. */
async function reportedLines(code, messageStart, filePath = 'component.tsx') {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.message.startsWith(messageStart)).map((message) => message.line);
}

test('reports toFixed digits shown to the user, toLocale*String and Intl formatters', async () => {
  const code = [
    'export const A = ({ t, amount, date }) => {',
    "  const label = amount.toFixed(3) + ' HBD';",
    '  const text = `${amount.toFixed(2)} HIVE`;',
    "  const title = t('a.b', { value: amount.toFixed(2) });",
    '  const when = date.toLocaleDateString() + date.toLocaleString(\'pl\');',
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
