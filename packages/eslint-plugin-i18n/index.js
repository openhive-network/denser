/**
 * The i18n lint rules of @hive/eslint-config-custom, one name each so a disable for one leaves the
 * others on: user-facing text through t(), display formatting through @ui/lib/locale-format, and whole
 * sentences in one key.
 */
module.exports = {
  rules: {
    'no-untranslated-text': require('./rules/no-untranslated-text'),
    'no-adhoc-format': require('./rules/no-adhoc-format'),
    'no-joined-translation': require('./rules/no-joined-translation')
  }
};
