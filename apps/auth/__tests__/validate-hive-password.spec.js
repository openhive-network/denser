import { expect, test } from '@jest/globals';
import { validateWifKey } from '../../../packages/smart-signer/lib/validators/validate-wif-key';

const t = (v) => v;
const runValidateWifKey = (v) => {
  return validateWifKey(v, t);
}

test('test validator function runValidateWifKey', () => {

  expect(runValidateWifKey('5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw')).toBeNull();
  expect(runValidateWifKey('P5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw')).toBeNull();

  expect(runValidateWifKey(''))
    .toBe('chainvalidation_js.password_should_not_be_empty');
  expect(runValidateWifKey('aa'))
    .toBe('chainvalidation_js.invalid_password_format');
  expect(runValidateWifKey('5A'))
    .toBe('chainvalidation_js.invalid_password_format');
  expect(runValidateWifKey('P5A'))
    .toBe('chainvalidation_js.invalid_password_format');

  expect(runValidateWifKey('5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsa'))
    .toBe('chainvalidation_js.invalid_password_checksum');

});
