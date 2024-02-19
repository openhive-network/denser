import { expect, test } from '@jest/globals';
import { validateHivePassword } from '../../../packages/smart-signer/lib/validators/validate-hive-password';

const t = (v) => v;
const runValidateHivePassword = (v) => {
  return validateHivePassword(v, t);
}

test('test validator function runValidateHivePassword', () => {

  expect(runValidateHivePassword('5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw')).toBeNull();
  expect(runValidateHivePassword('P5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw')).toBeNull();

  expect(runValidateHivePassword(''))
    .toBe('chainvalidation_js.password_should_not_be_empty');
  expect(runValidateHivePassword('aa'))
    .toBe('chainvalidation_js.invalid_password_format');
  expect(runValidateHivePassword('5A'))
    .toBe('chainvalidation_js.invalid_password_format');
  expect(runValidateHivePassword('P5A'))
    .toBe('chainvalidation_js.invalid_password_format');

  expect(runValidateHivePassword('5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsa'))
    .toBe('chainvalidation_js.invalid_password_checksum');

});
