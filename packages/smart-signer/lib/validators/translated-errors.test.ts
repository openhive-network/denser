import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { withTranslatedErrors } from './translated-errors.ts';

const TEXTS: Record<string, string> = {
  'login_form.zod_error.invalid_wif': 'Nieprawidłowy klucz WIF',
  'chainvalidation_js.account_name_should_be_longer': 'Nazwa konta powinna być dłuższa.'
};
const translate = (key: string) => TEXTS[key] ?? `missing:${key}`;

const failing =
  (errors: FieldErrors): Resolver<FieldValues> =>
  async () => ({ values: {}, errors });

describe('withTranslatedErrors', () => {
  it("shows a field error's translation key in the page's language", async () => {
    const resolver = withTranslatedErrors(
      failing({ wif: { type: 'custom', message: 'login_form.zod_error.invalid_wif' } }),
      translate
    );
    const { errors } = await resolver({}, undefined, { fields: {}, shouldUseNativeValidation: false });
    assert.equal(errors.wif?.message, 'Nieprawidłowy klucz WIF');
  });

  it('keeps a message that is already text, and translates the fields of a nested field', async () => {
    const ref = { name: 'repeat', focus: () => undefined };
    const resolver = withTranslatedErrors(
      failing({
        repeat: { type: 'custom', message: 'The passwords do not match.', ref },
        account: { name: { type: 'custom', message: 'chainvalidation_js.account_name_should_be_longer' } }
      }),
      translate
    );
    const { errors } = await resolver({}, undefined, { fields: {}, shouldUseNativeValidation: false });
    assert.equal(errors.repeat?.message, 'The passwords do not match.');
    assert.equal(errors.repeat?.ref, ref);
    const account = errors.account as FieldErrors | undefined;
    assert.equal(account?.name?.message, 'Nazwa konta powinna być dłuższa.');
  });
});
