import badActorList from '@ui/config/lists/bad-actor-list';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import { checkAccountNameFormat, type AccountNameFormatError } from '@ui/lib/account-name-rules';

/** The smart-signer translation keys of the format errors. */
const FORMAT_ERROR_MESSAGES: Record<AccountNameFormatError, string> = {
  empty: 'chainvalidation_js.account_name_should_not_be_empty',
  too_short: 'chainvalidation_js.account_name_should_be_longer',
  too_long: 'chainvalidation_js.account_name_should_be_shorter',
  segment_charset: 'chainvalidation_js.each_account_segment_should_have_only_letters_digits_or_dashes',
  segment_start: 'chainvalidation_js.each_account_segment_should_start_with_a_letter',
  segment_end: 'chainvalidation_js.each_account_segment_should_end_with_a_letter_or_digit',
  segment_too_short: 'chainvalidation_js.each_account_segment_should_be_longer'
};

const LENGTH_ERRORS: ReadonlySet<AccountNameFormatError> = new Set(['empty', 'too_short', 'too_long']);

/** The smart-signer translation key of what is wrong with account name `value`, or null. */
export function validateHiveAccountName(value: string): string | null {
  const formatError = checkAccountNameFormat(value);
  if (formatError && LENGTH_ERRORS.has(formatError)) {
    return FORMAT_ERROR_MESSAGES[formatError];
  }
  if (badActorList.includes(value) || dmcaUserList.includes(value)) {
    return 'chainvalidation_js.badactor';
  }
  return formatError ? FORMAT_ERROR_MESSAGES[formatError] : null;
}
