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
