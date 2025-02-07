/**
 * Based on: https://raw.githubusercontent.com/openhive-network/condenser/master/src/app/utils/ChainValidation.js
 */
import {LocalizationOptions} from '../../Localization';
import BadActorList from './BadActorList';

export class AccountNameValidator {
    public static validateAccountName(value: string, localization: LocalizationOptions) {
        let i;
        let label;
        let len;

        if (!value) {
            return localization.accountNameWrongLength;
        }
        const length = value.length;
        if (length < 3) {
            return localization.accountNameWrongLength;
        }
        if (length > 16) {
            return localization.accountNameWrongLength;
        }
        if (BadActorList.includes(value)) {
            return localization.accountNameBadActor;
        }
        const ref = value.split('.');
        for (i = 0, len = ref.length; i < len; i++) {
            label = ref[i];
            if (!/^[a-z]/.test(label)) {
                return localization.accountNameWrongSegment;
                // each_account_segment_should_start_with_a_letter
            }
            if (!/^[a-z0-9-]*$/.test(label)) {
                return localization.accountNameWrongSegment;
                // each_account_segment_should_have_only_letters_digits_or_dashes
            }
            if (!/[a-z0-9]$/.test(label)) {
                return localization.accountNameWrongSegment;
                // each_account_segment_should_end_with_a_letter_or_digit
            }
            if (!(label.length >= 3)) {
                return localization.accountNameWrongSegment;
                // each_account_segment_should_be_longer
            }
        }
        return null;
    }
}
