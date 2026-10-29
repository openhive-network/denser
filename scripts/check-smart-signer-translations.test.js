const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getLeaves } = require('./translation-validator');
const { compareLocale } = require('./check-smart-signer-translations');

const reference = getLeaves({
  login_form: {
    signin_with_hiveauth: 'HiveAuth',
    use_peakvault: 'Use Peakvault',
    zod_error: { posting_key_for_active: "The wallet needs your active key; a posting key can't sign transfers" }
  }
});

test('a missing key and a label left in English are reported in Polish; a signing service name is not', () => {
  const pl = getLeaves({
    login_form: { signin_with_hiveauth: 'HiveAuth', use_peakvault: 'Use Peakvault' }
  });
  assert.deepEqual(compareLocale(reference, pl, 'pl'), {
    missing: ['login_form.zod_error.posting_key_for_active'],
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
      zod_error: { posting_key_for_active: "The wallet needs your active key; a posting key can't sign transfers" }
    }
  });
  assert.deepEqual(compareLocale(reference, es, 'es').untranslated, [
    'login_form.use_peakvault',
    'login_form.zod_error.posting_key_for_active'
  ]);
});
