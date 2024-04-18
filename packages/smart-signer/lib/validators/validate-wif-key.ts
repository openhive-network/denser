import { cryptoUtils } from '@hiveio/dhive';

export function validateWifKey(
  password: string,
  translateFn: (v: string) => string = (v) => v
): string | null {
  if (!password) {
    return translateFn('chainvalidation_js.wif_should_not_be_empty');
  }
  // A Hive generated password is a WIF prefixed with a P.
  // It is possible to login directly with a WIF.
  const wif = /^P/.test(password) ? password.substring(1) : password;

  if (!/^5[HJK].{45,}/i.test(wif)) {
    // 51 is the wif length.
    // TODO So why do we check for string length 47 or more?
    return translateFn('chainvalidation_js.invalid_wif_format');
  }
  if (!cryptoUtils.isWif(wif)) {
    return translateFn('chainvalidation_js.invalid_wif_checksum');
  }
  return null;
}
