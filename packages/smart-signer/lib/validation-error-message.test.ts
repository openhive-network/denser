import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import * as z from 'zod';

const EN_URL = new URL('../locales/en/smart-signer.json', import.meta.url);
const EN = JSON.parse(readFileSync(EN_URL, 'utf8'));

// Under node's type stripping the `@smart-signer/` alias does not resolve
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@smart-signer/locales/en/smart-signer.json') {
      const source = `export default ${JSON.stringify(EN)};`;
      return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
});

const { validationErrorMessage } = await import('./validation-error-message.ts');

const errorOf = (schema: z.ZodTypeAny, value: unknown): z.ZodError => {
  const result = schema.safeParse(value);
  assert.equal(result.success, false);
  return result.error as z.ZodError;
};

describe('validationErrorMessage', () => {
  it("answers a translation key's English text", () => {
    const schema = z.object({
      username: z
        .string()
        .refine(() => false, { message: 'chainvalidation_js.account_name_should_be_longer' })
    });
    assert.equal(
      validationErrorMessage(errorOf(schema, { username: 'ab' })),
      EN.chainvalidation_js.account_name_should_be_longer
    );
    assert.equal(EN.chainvalidation_js.account_name_should_be_longer, 'Account name should be longer.');
  });

  it('keeps a message that is no key, and joins the issues', () => {
    const schema = z.object({
      keyType: z.string({ required_error: 'keyType is required' }),
      username: z.string().refine(() => false, { message: 'chainvalidation_js.badactor' })
    });
    assert.equal(
      validationErrorMessage(errorOf(schema, { username: 'x' })),
      `keyType is required, ${EN.chainvalidation_js.badactor}`
    );
  });

  it('keeps a message naming a key group or a missing key', () => {
    const schema = z.string().refine(() => false, { message: 'chainvalidation_js' });
    assert.equal(validationErrorMessage(errorOf(schema, '')), 'chainvalidation_js');
    const missing = z.string().refine(() => false, { message: 'chainvalidation_js.no_such_key' });
    assert.equal(validationErrorMessage(errorOf(missing, '')), 'chainvalidation_js.no_such_key');
  });
});
