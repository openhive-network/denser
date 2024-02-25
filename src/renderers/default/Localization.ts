import ow from 'ow';

export class Localization {
    public static validate(o: LocalizationOptions) {
        ow(o, 'LocalizationOptions', ow.object);
        ow(o.phishingWarning, 'LocalizationOptions.phishingWarning', ow.string.nonEmpty);
        ow(o.externalLink, 'LocalizationOptions.externalLink', ow.string.nonEmpty);
        ow(o.noImage, 'LocalizationOptions.noImage', ow.string.nonEmpty);
        ow(o.accountNameWrongLength, 'LocalizationOptions.accountNameWrongLength', ow.string.nonEmpty);
        ow(o.accountNameBadActor, 'LocalizationOptions.accountNameBadActor', ow.string.nonEmpty);
        ow(o.accountNameWrongSegment, 'LocalizationOptions.accountNameWrongSegment', ow.string.nonEmpty);
    }

    public static DEFAULT: LocalizationOptions = {
        phishingWarning: 'Link expanded to plain text; beware of a potential phishing attempt',
        externalLink: 'This link will take you away from example.com',
        noImage: 'Images not allowed',
        accountNameWrongLength: 'Account name should be between 3 and 16 characters long',
        accountNameBadActor: 'This account is on a bad actor list',
        accountNameWrongSegment: 'This account name contains a bad segment'
    };
}

export interface LocalizationOptions {
    phishingWarning: string; // "Link expanded to plain text; beware of a potential phishing attempt"
    externalLink: string; // "This link will take you away from example.com"
    noImage: string; // "Images not allowed"
    accountNameWrongLength: string; // "Account name should be between 3 and 16 characters long."
    accountNameBadActor: string; // "This account is on a bad actor list"
    accountNameWrongSegment: string; // "This account name contains a bad segment"
}
