/**
 * Based on: https://raw.githubusercontent.com/openhive-network/condenser/master/src/app/utils/ChainValidation.js
 */
import {checkAccountNameFormat} from '@hive/ui/lib/account-name-rules';
import {LocalizationOptions} from '../../Localization';
import BadActorList from './BadActorList';

export class AccountNameValidator {
    public static validateAccountName(value: string, localization: LocalizationOptions) {
        const formatError = checkAccountNameFormat(value);
        if (formatError === 'empty' || formatError === 'too_short' || formatError === 'too_long') {
            return localization.accountNameWrongLength;
        }
        if (BadActorList.includes(value)) {
            return localization.accountNameBadActor;
        }
        if (formatError) {
            return localization.accountNameWrongSegment;
        }
        return null;
    }
}
