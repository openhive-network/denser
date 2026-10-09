import badActorList from '@ui/config/lists/bad-actor-list';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import { checkAccountNameFormat, type AccountNameFormatError } from '@ui/lib/account-name-rules';

const FORMAT_ERROR_MESSAGES: Record<AccountNameFormatError, string> = {
  empty: 'Account name should not be empty.',
  too_short: 'Account name should be longer.',
  too_long: 'Account name should be shorter.',
  segment_charset: 'Each account segment should have only lowercase letters, digits, or dashes.',
  segment_start: 'Each account segment should start with a letter.',
  segment_end: 'Each account segment should end with a letter or digit.',
  segment_too_short: 'Each account segment should be longer.'
};

const LENGTH_ERRORS: ReadonlySet<AccountNameFormatError> = new Set(['empty', 'too_short', 'too_long']);

export function validateHiveAccountName(
  value: string,
  translateFn: (v: string) => string = (v) => v
): string | null {
  const formatError = checkAccountNameFormat(value);
  if (formatError && LENGTH_ERRORS.has(formatError)) {
    return FORMAT_ERROR_MESSAGES[formatError];
  }
  if (badActorList.includes(value) || dmcaUserList.includes(value)) {
    return 'Use caution sending to this account. Please double check your spelling for possible phishing.';
  }
  return formatError ? FORMAT_ERROR_MESSAGES[formatError] : null;
}
