import badActorList from '@ui/config/lists/bad-actor-list';
import dmcaUserList from '@ui/config/lists/dmca-user-list';

export function validateHiveAccountName(
  value: string,
  translateFn: (v: string) => string = (v) => v
): string | null {
  let i, label, len;

  if (!value) {
    return 'Account name should not be empty.';
  }
  const { length } = value;
  if (length < 3) {
    return 'Account name should be longer.';
  }
  if (length > 16) {
    return 'Account name should be shorter.';
  }
  if (badActorList.includes(value) || dmcaUserList.includes(value)) {
    return 'Use caution sending to this account. Please double check your spelling for possible phishing.';
  }
  const ref = value.split('.');
  for (i = 0, len = ref.length; i < len; i += 1) {
    label = ref[i];
    if (!/^[a-z0-9-]*$/.test(label)) {
      return 'Each account segment should have only lowercase letters, digits, or dashes.';
    }
    if (!/^[a-z]/.test(label)) {
      return 'Each account segment should start with a letter.';
    }
    if (/--/.test(label)) {
      return 'Each account segment should have only one dash in a row.';
    }
    if (!/[a-z0-9]$/.test(label)) {
      return 'Each account segment should end with a letter or digit.';
    }
    if (!(label.length >= 3)) {
      return 'Each account segment should be longer.';
    }
  }
  return null;
}
