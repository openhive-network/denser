import { expect, test } from '@jest/globals';
import { validateHiveAccountName } from '../lib/validate-hive-account-name';

const t = (v) => v;
const runValidateHiveAccountName = (v) => {
  return validateHiveAccountName(v, t);
}

test('test validator function runValidateHiveAccountName', () => {

  expect(runValidateHiveAccountName('alice')).toBeNull();
  expect(runValidateHiveAccountName('alice.brown')).toBeNull();
  expect(runValidateHiveAccountName('alice-brown')).toBeNull();
  expect(runValidateHiveAccountName('alice-brown.red')).toBeNull();
  expect(runValidateHiveAccountName('alice-blue.red-r')).toBeNull();
  expect(runValidateHiveAccountName('alice1-brown1')).toBeNull();

  expect(runValidateHiveAccountName(''))
    .toBe('chainvalidation_js.account_name_should_not_be_empty');

  expect(runValidateHiveAccountName('aa'))
    .toBe('chainvalidation_js.account_name_should_be_longer');

  expect(runValidateHiveAccountName('longer-than-16-characters'))
    .toBe('chainvalidation_js.account_name_should_be_shorter');

  expect(runValidateHiveAccountName('aalpha'))
    .toBe('chainvalidation_js.badactor');

  expect(runValidateHiveAccountName('Alice'))
    .toBe('chainvalidation_js.each_account_segment_should_have_only_letters_digits_or_dashes');
  expect(runValidateHiveAccountName('aLice'))
    .toBe('chainvalidation_js.each_account_segment_should_have_only_letters_digits_or_dashes');

  expect(runValidateHiveAccountName('alice.'))
    .toBe('chainvalidation_js.each_account_segment_should_start_with_a_letter');
  expect(runValidateHiveAccountName('alice..'))
    .toBe('chainvalidation_js.each_account_segment_should_start_with_a_letter');
  expect(runValidateHiveAccountName('1alice'))
    .toBe('chainvalidation_js.each_account_segment_should_start_with_a_letter');
  expect(runValidateHiveAccountName('.alice'))
    .toBe('chainvalidation_js.each_account_segment_should_start_with_a_letter');

  expect(runValidateHiveAccountName('alice.al'))
    .toBe('chainvalidation_js.each_account_segment_should_be_longer');

  expect(runValidateHiveAccountName('alice--brown'))
    .toBe('chainvalidation_js.each_account_segment_should_have_only_one_dash_in_a_row');

  expect(runValidateHiveAccountName('alice-brown-'))
    .toBe('chainvalidation_js.each_account_segment_should_end_with_a_letter_or_digit');

});
