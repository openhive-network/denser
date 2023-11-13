import {expect, jest, test} from '@jest/globals';
import { validateHiveAccountName } from '../lib/validate-hive-account-name';

test('test validator validateHiveAccountName', () => {
  expect(validateHiveAccountName('John'))
    .toBe('chainvalidation_js.each_account_segment_should_start_with_a_letter');
});
