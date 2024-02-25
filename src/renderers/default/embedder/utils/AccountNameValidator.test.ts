import {expect} from 'chai';
import {Localization} from '../../Localization';
import {AccountNameValidator} from './AccountNameValidator';

describe('AccountNameValidator', () => {
    ['', 'a', 'aa', 'nametoolongtohandle'].forEach((input) => {
        it(`should return accountNameWrongLength for invalid account name (${input})`, () => {
            const actual = AccountNameValidator.validateAccountName(input, Localization.DEFAULT);
            expect(actual).to.be.equal(Localization.DEFAULT.accountNameWrongLength);
        });
    });

    it('should return accountNameBadActor for bad actor account name', () => {
        const actual = AccountNameValidator.validateAccountName('aalpha', Localization.DEFAULT);
        expect(actual).to.be.equal(Localization.DEFAULT.accountNameBadActor);
    });

    ['something.', '.something', 'a..a', 'something.a', 'a.something', 'a.a.a', 'something.ab', '123', '3speak', 'something.123', '-something', 'something-'].forEach(
        (input) => {
            it(`should return accountNameWrongSegment for invalid account name (${input})`, () => {
                const actual = AccountNameValidator.validateAccountName(input, Localization.DEFAULT);
                expect(actual).to.be.equal(Localization.DEFAULT.accountNameWrongSegment);
            });
        }
    );

    ['engrave', 'hive--blocks', 'something.abc'].forEach((input) => {
        it(`should return null for valid account name (${input})`, () => {
            const actual = AccountNameValidator.validateAccountName(input, Localization.DEFAULT);
            expect(actual).to.be.equal(null);
        });
    });
});
