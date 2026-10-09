export type AccountNameFormatError =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'segment_charset'
  | 'segment_start'
  | 'segment_end'
  | 'segment_too_short';

const MIN_ACCOUNT_NAME_LENGTH = 3;
const MAX_ACCOUNT_NAME_LENGTH = 16;
const MIN_SEGMENT_LENGTH = 3;

/**
 * Checks a Hive account name against the protocol format rules (wax `isValidAccountName`
 * is the reference). Consecutive dashes are valid; an empty dot-separated segment is not.
 *
 * Returns the first rule the name breaks, or `null` when the format is valid. Length is
 * checked before segments, and within a segment: charset, start, end, length.
 */
export function checkAccountNameFormat(name: string): AccountNameFormatError | null {
  if (!name) return 'empty';
  if (name.length < MIN_ACCOUNT_NAME_LENGTH) return 'too_short';
  if (name.length > MAX_ACCOUNT_NAME_LENGTH) return 'too_long';

  for (const segment of name.split('.')) {
    if (!/^[a-z0-9-]*$/.test(segment)) return 'segment_charset';
    if (!/^[a-z]/.test(segment)) return 'segment_start';
    if (!/[a-z0-9]$/.test(segment)) return 'segment_end';
    if (segment.length < MIN_SEGMENT_LENGTH) return 'segment_too_short';
  }
  return null;
}
