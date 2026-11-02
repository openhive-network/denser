const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getLeaves } = require('./translation-validator');
const { compareLocale } = require('./check-smart-signer-translations');

const reference = getLeaves({
  login_form: {
    signin_with_hiveauth: 'HiveAuth',
    use_peakvault: 'Use Peakvault',
    zod_error: { key_without_active_authority: "This key doesn't have active authority. The wallet needs your active key to sign this" }
  }
});

test('a missing key and a label left in English are reported in Polish; a signing service name is not', () => {
  const pl = getLeaves({
    login_form: { signin_with_hiveauth: 'HiveAuth', use_peakvault: 'Use Peakvault' }
  });
  assert.deepEqual(compareLocale(reference, pl, 'pl'), {
    missing: ['login_form.zod_error.key_without_active_authority'],
    extra: [],
    placeholders: [],
    untranslated: ['login_form.use_peakvault']
  });
});

test('elsewhere an English sentence and a short label are both reported', () => {
  const es = getLeaves({
    login_form: {
      signin_with_hiveauth: 'HiveAuth',
      use_peakvault: 'Use Peakvault',
      zod_error: { key_without_active_authority: "This key doesn't have active authority. The wallet needs your active key to sign this" }
    }
  });
  assert.deepEqual(compareLocale(reference, es, 'es').untranslated, [
    'login_form.use_peakvault',
    'login_form.zod_error.key_without_active_authority'
  ]);
});
