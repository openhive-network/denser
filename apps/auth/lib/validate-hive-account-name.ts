import BadActorList from './bad-actor-list';

export function validateHiveAccountName(
        value: string,
        translateFn: (v: string) => string = (v) => v
        ): string | null {
    let i, label, len;

    if (!value) {
        return translateFn('chainvalidation_js.account_name_should_not_be_empty');
    }
    const { length } = value;
    if (length < 3) {
        return translateFn('chainvalidation_js.account_name_should_be_longer');
    }
    if (length > 16) {
        return translateFn('chainvalidation_js.account_name_should_be_shorter');
    }
    if (BadActorList.includes(value)) {
        return translateFn('chainvalidation_js.badactor');
    }
    const ref = value.split('.');
    for (i = 0, len = ref.length; i < len; i += 1) {
        label = ref[i];
        if (!/^[a-z0-9-]*$/.test(label)) {
            return translateFn('chainvalidation_js.each_account_segment_should_have_only_letters_digits_or_dashes');
        }
        if (!/^[a-z]/.test(label)) {
            return translateFn('chainvalidation_js.each_account_segment_should_start_with_a_letter');
        }
        if (/--/.test(label)) {
            return translateFn('chainvalidation_js.each_account_segment_should_have_only_one_dash_in_a_row');
        }
        if (!/[a-z0-9]$/.test(label)) {
            return translateFn('chainvalidation_js.each_account_segment_should_end_with_a_letter_or_digit');
        }
        if (!(label.length >= 3)) {
            return translateFn('chainvalidation_js.each_account_segment_should_be_longer');
        }
    }
    return null;
}
